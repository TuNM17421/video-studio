import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ScoutEvent } from "../scout";
import { REPO } from "./paths";
import { confirmScout, currentScout, SCOUT_ROOT, startScout, startSlideScout, stopScout, subscribeScout } from "./scout";

/**
 * Bộ chạy này gọi ra một tiến trình thật, nên nó được thử bằng một CLI giả: một script in đúng mấy dòng
 * stream-json mà `claude -p` in ra rồi thoát. Không mạng, không tốn credit, và quan trọng hơn cả — chạy
 * được đủ nhanh để thử cả trường hợp hai lượt nối đuôi nhau, thứ đã sinh ra lỗi "lượt chạy trọn vẹn bị
 * đánh dấu đã dừng".
 */
const temporary: string[] = [];

function stub(lines: unknown[], { hang = false, files = {} as Record<string, string> } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "scout-stub-"));
  temporary.push(root);
  const script = path.join(root, "stub.mjs");
  fs.writeFileSync(script, [
    // `files` giả những gì agent thật ghi xuống đĩa (muc-research.json, items/m1.json…).
    `import fs from "node:fs"; import path from "node:path";`,
    `for (const [file, body] of Object.entries(${JSON.stringify(files)})) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body); }`,
    `const lines = ${JSON.stringify(lines)};`,
    `for (const line of lines) console.log(JSON.stringify(line));`,
    // `hang` giả một lượt còn đang chạy, để thử nút Dừng.
    hang ? `setTimeout(() => {}, 60000);` : ``,
  ].join("\n"));

  // spawn() không chạy được một file .mjs trực tiếp, nên bọc bằng cái vỏ mà nền tảng này gọi được.
  if (process.platform === "win32") {
    const cmd = path.join(root, "claude.cmd");
    fs.writeFileSync(cmd, `@echo off\r\nnode "${script}"\r\n`);
    return cmd;
  }
  const sh = path.join(root, "claude.sh");
  fs.writeFileSync(sh, `#!/bin/sh\nexec node "${script}"\n`, { mode: 0o755 });
  return sh;
}

const say = (blocks: unknown[]) => ({ type: "assistant", message: { content: blocks } });
const tool = (name: string, input: Record<string, unknown>) => ({ type: "tool_use", name, input });
const success = { type: "result", subtype: "success", is_error: false, result: "Đã xong." };

/** Chờ sự kiện `done` của lượt đang chạy — mọi phần trạng thái chỉ chốt lại sau khi tiến trình đóng. */
function done() {
  return waitFor("done") as Promise<ScoutEvent & { kind: "done" }>;
}

function waitFor(kind: ScoutEvent["kind"]) {
  return new Promise<ScoutEvent>((resolve) => {
    const off = subscribeScout((event) => {
      if (event.kind !== kind) return;
      off();
      resolve(event);
    });
  });
}

const dirs: string[] = [];
function run(topic: string, bin: string, lines: unknown[], options?: { hang?: boolean }) {
  process.env.CLAUDE_BIN = bin || stub(lines, options);
  const started = startScout({ topic, minSources: 2, cues: 6 });
  dirs.push(path.join(REPO, started.dir));
  return started;
}

afterEach(() => {
  delete process.env.CLAUDE_BIN;
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
  for (const root of temporary.splice(0)) fs.rmSync(root, { recursive: true, force: true });
  if (fs.existsSync(SCOUT_ROOT) && fs.readdirSync(SCOUT_ROOT).length === 0) fs.rmSync(SCOUT_ROOT, { recursive: true, force: true });
});

describe("lượt tìm tài liệu", () => {
  it("dịch mỗi lần gọi công cụ thành một dòng của flow", async () => {
    const lines = [
      say([tool("WebSearch", { query: "token là gì" })]),
      say([tool("WebFetch", { url: "https://example.com/a", prompt: "tóm tắt" })]),
      say([tool("Write", { file_path: "C:\\repo\\scout\\token-la-gi\\sources\\s1.md" })]),
      say([{ type: "text", text: "Đã tải một nguồn." }]),
      success,
    ];
    run("token là gì", "", lines);
    await done();

    const current = currentScout()!;
    expect(current.status).toBe("done");
    const kinds = current.events.map((e) => e.kind);
    expect(kinds).toEqual(["start", "search", "fetch", "save", "say", "done"]);

    const search = current.events.find((e) => e.kind === "search");
    expect(search).toMatchObject({ query: "token là gì" });
    const fetched = current.events.find((e) => e.kind === "fetch");
    expect(fetched).toMatchObject({ url: "https://example.com/a" });
    // Đường dẫn tuyệt đối của agent được rút về phần nằm trong thư mục lượt chạy.
    const saved = current.events.find((e) => e.kind === "save");
    expect(saved).toMatchObject({ file: "sources/s1.md" });
  });

  it("agent kết thúc mà không báo thành công thì là lỗi, không phải xong", async () => {
    run("chủ đề hỏng", "", [say([{ type: "text", text: "thôi" }])]);
    const event = await done();
    expect(event.ok).toBe(false);
    expect(currentScout()!.status).toBe("error");
  });

  it("bấm Dừng thì lượt đó là đã dừng", async () => {
    run("chủ đề bị dừng", "", [say([tool("WebSearch", { query: "x" })])], { hang: true });
    expect(stopScout()).toBe(true);
    const event = await done();
    expect(event.ok).toBe(false);
    expect(currentScout()!.status).toBe("stopped");
  });

  it("lượt bị dừng không kéo lượt sau xuống theo, và không trộn sự kiện vào nó", async () => {
    // Một lượt chạy thật đã bị đánh dấu "đã dừng" dù nó chạy trọn vẹn, ngay sau một lượt bị Dừng. Không
    // dựng lại được đúng thời điểm gây ra (startScout chặn chạy chồng, nên khe hở rất hẹp), nên test này
    // khoá phần kiểm được: hai lượt nối nhau phải độc lập cả về trạng thái lẫn danh sách sự kiện. Bản
    // thân việc sửa là buộc mọi closure vào đối tượng lượt của nó thay vì đọc `registry.run` toàn cục.
    run("lượt trước bị dừng", "", [say([tool("WebSearch", { query: "cũ" })])], { hang: true });
    stopScout();
    await done();

    run("lượt sau chạy trọn", "", [say([tool("WebSearch", { query: "mới" })]), success]);
    const event = await done();

    expect(event.ok).toBe(true);
    const current = currentScout()!;
    expect(current.status).toBe("done");
    expect(current.slug).toBe("luot-sau-chay-tron");
    const queries = current.events.flatMap((e) => (e.kind === "search" ? [e.query] : []));
    expect(queries).toEqual(["mới"]);
  });

  it("từ chối chạy chồng lên một lượt đang chạy", async () => {
    run("đang chạy", "", [say([tool("WebSearch", { query: "x" })])], { hang: true });
    expect(() => startScout({ topic: "chen ngang", minSources: 2, cues: 6 })).toThrow(/đang có một lượt chạy/i);
    stopScout();
    await done();
  });
});

describe("lượt từ slide", () => {
  const slug = "bai-giang-thu";
  const file = (rel: string) => path.join(REPO, "scout", slug, rel);
  const extraction = {
    title: "Bài giảng thử", slides: 2,
    outline: [{ slide: 1, heading: "Mở đầu", points: ["Năm 2023 có 100 triệu người dùng"] }],
    items: [
      { id: "m1", slides: [1], title: "Số người dùng", claim: "100 triệu người dùng năm 2023", kind: "so-lieu", why: "số liệu có thể đã cũ", queries: ["số người dùng 2024"] },
      { id: "m2", slides: [2], title: "Định nghĩa mô hình", claim: "mô hình là…", kind: "dinh-nghia", why: "", queries: [] },
    ],
  };

  it("bóc tách xong thì dừng chờ duyệt, xác nhận thì research đúng những mục đã chọn", async () => {
    process.env.CLAUDE_BIN = stub([success], { files: { [file("muc-research.json")]: JSON.stringify(extraction) } });
    const started = startSlideScout({ topic: "Bài giảng thử", minSources: 2, cues: 6 }, { name: "bai.pdf", bytes: new TextEncoder().encode("%PDF-1.4 /Type /Page /Type /Page") });
    dirs.push(path.join(REPO, started.dir));
    expect(started.dir).toBe(`scout/${slug}`);
    await waitFor("review");

    const review = currentScout()!;
    expect(review.status).toBe("review");
    expect(review.deck).toMatchObject({ format: "pdf", slides: 2, file: "slide.pdf" });
    expect(fs.existsSync(file("slide.pdf"))).toBe(true);
    expect(review.extraction!.items.map((it) => it.id)).toEqual(["m1", "m2"]);

    // Người dùng chỉ giữ mục thứ hai: nó phải thành m1 để khớp TodoWrite và items/m1.json của agent.
    process.env.CLAUDE_BIN = stub([
      say([tool("TodoWrite", { todos: [{ content: "m1 · Định nghĩa mô hình", status: "in_progress" }, { content: "Viết kịch bản", status: "pending" }] })]),
      say([tool("WebSearch", { query: "định nghĩa mô hình" })]),
      say([tool("Write", { file_path: `C:\repo\scout\${slug}\items\m1.json` })]),
      say([tool("TodoWrite", { todos: [{ content: "m1 · Định nghĩa mô hình", status: "completed" }, { content: "Viết kịch bản", status: "in_progress" }] })]),
      success,
    ], { files: { [file("items/m1.json")]: JSON.stringify({ id: "m1", verdict: "xac-nhan", finding: "Khớp slide.", sources: ["s1"] }) } });
    const confirmed = confirmScout(review.extraction!.items.map((it, i) => ({ ...it, selected: i === 1 })));
    expect(confirmed.items.map((it) => [it.id, it.title])).toEqual([["m1", "Định nghĩa mô hình"]]);
    const event = await done();

    expect(event.ok).toBe(true);
    const current = currentScout()!;
    expect(current.status).toBe("done");
    expect(current.itemStates.m1).toBe("done");
    expect(current.findings.m1).toMatchObject({ verdict: "xac-nhan" });
    // Lượt tìm xảy ra khi agent đang ở m1 thì thuộc về nút m1.
    expect(current.events.find((e) => e.kind === "search")).toMatchObject({ stage: "research", item: "m1" });
    // Không có kịch bản thì nút viết kịch bản không được tính là xong.
    expect(current.itemStates.script).toBe("pending");
  });

  it("agent không ghi được danh sách mục thì lượt là lỗi, không dừng chờ duyệt", async () => {
    process.env.CLAUDE_BIN = stub([success], { files: { [file("muc-research.json")]: "không phải JSON" } });
    const started = startSlideScout({ topic: "Bài giảng thử", minSources: 2, cues: 6 }, { name: "bai.pdf", bytes: new TextEncoder().encode("%PDF-1.4") });
    dirs.push(path.join(REPO, started.dir));
    const event = await done();
    expect(event.ok).toBe(false);
    expect(currentScout()!.status).toBe("error");
    expect(() => confirmScout([])).toThrow(/chờ duyệt/);
  });

  it("file không phải PDF hay PPTX thật thì từ chối trước khi tạo thư mục", () => {
    expect(() => startSlideScout({ topic: "Hỏng", minSources: 2, cues: 6 }, { name: "hong.pdf", bytes: new TextEncoder().encode("PK") })).toThrow(/không phải PDF/);
    expect(() => startSlideScout({ topic: "Hỏng", minSources: 2, cues: 6 }, { name: "hong.docx", bytes: new Uint8Array(1) })).toThrow(/\.pdf hoặc \.pptx/);
    expect(fs.existsSync(path.join(REPO, "scout", "hong"))).toBe(false);
  });
});
