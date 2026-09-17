import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ScoutEvent } from "../scout";
import { REPO } from "./paths";
import { currentScout, SCOUT_ROOT, startScout, stopScout, subscribeScout } from "./scout";

/**
 * Bộ chạy này gọi ra một tiến trình thật, nên nó được thử bằng một CLI giả: một script in đúng mấy dòng
 * stream-json mà `claude -p` in ra rồi thoát. Không mạng, không tốn credit, và quan trọng hơn cả — chạy
 * được đủ nhanh để thử cả trường hợp hai lượt nối đuôi nhau, thứ đã sinh ra lỗi "lượt chạy trọn vẹn bị
 * đánh dấu đã dừng".
 */
const temporary: string[] = [];

function stub(lines: unknown[], { hang = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "scout-stub-"));
  temporary.push(root);
  const script = path.join(root, "stub.mjs");
  fs.writeFileSync(script, [
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
  return new Promise<ScoutEvent & { kind: "done" }>((resolve) => {
    const off = subscribeScout((event) => {
      if (event.kind !== "done") return;
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
