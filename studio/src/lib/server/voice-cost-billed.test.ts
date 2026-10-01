// Chi phí giọng phải bằng số ký tự ElevenLabs THẬT SỰ tính, không phải dự đoán của dry-run. Chạy tts.mjs
// thật qua đường request thật, server ElevenLabs giả (ELEVENLABS_API_BASE + TTS_CACHE_DIR, đúng cách
// tools/tts-billing.test.mjs làm): không key, không credit. Hai con số lệch nhau ở hai chỗ có thật, và mỗi
// chỗ là một ca dưới đây — nên đừng thay `billedCharacters` bằng một con số đoán trước lượt.
import { execFile } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { billedFromLine } from "../video-cost";
import { billedCharacters, elevenLabsCost } from "./voice-cost";

const execFileP = promisify(execFile);
const ROOT = path.resolve(process.cwd(), "..");
const TTS = path.join(ROOT, "tts-elevenlabs", "tts.mjs");
const MODEL = "eleven_flash_v2_5"; // $0,05 / 1k ký tự trong pricing-catalog.ts

/** Cách voice.ts đếm, nguyên văn: done từ dòng "→ ElevenLabs", billed/billedCues từ billedFromLine. */
function countFromStdout(stdout: string) {
  let done = 0;
  let billed = 0;
  let billedCues = 0;
  for (const line of stdout.split(/\r?\n/)) {
    if (/→ ElevenLabs/.test(line)) done++;
    const chars = billedFromLine(line);
    if (chars !== null) { billed += chars; billedCues++; }
  }
  return { done, billed, billedCues };
}

type Reply = { cost: number | null; alignment: boolean; status?: number };

function fakeElevenLabs(replyFor: (text: string) => Reply) {
  const seen: string[] = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      const { text } = JSON.parse(body || "{}") as { text: string };
      seen.push(text);
      const reply = replyFor(text);
      if (reply.status && reply.status !== 200) {
        res.writeHead(reply.status, { "content-type": "application/json" });
        return res.end(JSON.stringify({ detail: "fake failure" }));
      }
      const characters = [...text];
      res.writeHead(200, { "content-type": "application/json", ...(reply.cost === null ? {} : { "character-cost": String(reply.cost) }) });
      res.end(JSON.stringify({
        audio_base64: Buffer.alloc(24000).toString("base64"),
        // Bỏ alignment = ElevenLabs không trả mốc từng từ: tts.mjs KHÔNG ghi .align.json cho câu đó.
        ...(reply.alignment ? { alignment: { characters, character_start_times_seconds: characters.map((_, i) => i * 0.01) } } : {}),
      }));
    });
  });
  return new Promise<{ server: http.Server; seen: string[]; base: string }>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve({ server, seen, base: `http://127.0.0.1:${(server.address() as { port: number }).port}` })));
}

function fixture(texts: string[]) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-voice-cost-"));
  const cues = path.join(dir, "video", "cues.js");
  fs.mkdirSync(path.dirname(cues), { recursive: true });
  fs.writeFileSync(cues, `export const CUES = [${texts.map((t, i) => `{ n: ${i + 1}, text: ${JSON.stringify(t)} }`).join(", ")}];\n`);
  return { dir, cues };
}

const envFor = (dir: string, base: string) => ({
  ...process.env,
  ELEVENLABS_API_BASE: base,
  ELEVENLABS_API_KEY: "test-key",
  ELEVENLABS_VOICE_ID: "abcdefghijklmnopqrst",
  ELEVENLABS_MODEL_ID: MODEL,
  TTS_CACHE_DIR: path.join(dir, "cache"),
});

describe("tiền ElevenLabs theo số ký tự đã đo", () => {
  it("(a) câu không có mốc từng từ: dự đoán ghi 0 ký tự, lượt thật vẫn bị tính phí", async () => {
    const nonce = Date.now().toString(36);
    const withMarks = `Câu có mốc từng từ ${nonce}`;
    const noMarks = `Câu thiếu mốc từng từ ${nonce}`;
    const { dir, cues } = fixture([withMarks, noMarks]);
    const fake = await fakeElevenLabs((text) => ({ cost: [...text].length, alignment: text === withMarks }));
    const env = envFor(dir, fake.base);
    const generate = () => execFileP(process.execPath, [TTS, "generate", "--cues", cues, "--out", path.join(dir, "out")], { cwd: ROOT, env });
    const dryRun = async () => JSON.parse((await execFileP(process.execPath, [TTS, "generate", "--cues", cues, "--out", path.join(dir, "out"), "--dry-run", "--json"], { cwd: ROOT, env })).stdout) as { billable: number };

    await generate();
    expect(fake.seen).toHaveLength(2);

    // Trạng thái cache sau lượt 1: cả hai câu có .pcm, chỉ câu có mốc mới có .align.json.
    const cacheFiles = fs.readdirSync(path.join(dir, "cache"));
    expect(cacheFiles.filter((f) => f.endsWith(".pcm"))).toHaveLength(2);
    expect(cacheFiles.filter((f) => f.endsWith(".align.json"))).toHaveLength(1);

    // Đây chính là con số code CŨ dùng để tính tiền (billableChars → dry-run --json .billable).
    const forecast = (await dryRun()).billable;
    expect(forecast).toBe(0);

    // Lượt 2: tts.mjs sinh lại đúng câu thiếu mốc và bị tính phí thật.
    const second = await generate();
    expect(fake.seen).toHaveLength(3);
    expect(fake.seen[2]).toBe(noMarks);
    const measured = countFromStdout(second.stdout);
    expect(measured).toEqual({ done: 1, billed: [...noMarks].length, billedCues: 1 });

    const before = elevenLabsCost(MODEL, forecast, null, null);
    const after = elevenLabsCost(MODEL, billedCharacters(measured.done, measured.billed, measured.billedCues), null, null);
    // CŨ: $0 kèm nhãn "đã đo" cho một lượt đã tốn credit — đúng lỗi A5.
    expect(before).toMatchObject({ characters: 0, costUsd: 0, costSource: "server_price_estimate" });
    // MỚI: đúng số ký tự ElevenLabs báo.
    expect(after).toMatchObject({ characters: [...noMarks].length, costSource: "server_price_estimate" });
    expect(after.costUsd).toBeCloseTo(([...noMarks].length * 0.05) / 1000, 6);
    expect(after.costUsd!).toBeGreaterThan(0);

    fake.server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it("(b) lượt chết giữa chừng: dự đoán ghi cả video, đo được chỉ phần đã gửi", async () => {
    const nonce = `${Date.now().toString(36)}-b`;
    const texts = [`Câu một ${nonce}`, `Câu hai ${nonce}`, `Câu ba thì ElevenLabs sập ${nonce}`];
    const { dir, cues } = fixture(texts);
    const fake = await fakeElevenLabs((text) => ({ cost: [...text].length, alignment: true, status: text === texts[2] ? 500 : 200 }));
    const env = envFor(dir, fake.base);

    const forecast = JSON.parse((await execFileP(process.execPath,
      [TTS, "generate", "--cues", cues, "--out", path.join(dir, "out"), "--dry-run", "--json"], { cwd: ROOT, env })).stdout).billable as number;
    expect(forecast).toBe(texts.reduce((sum, t) => sum + [...t].length, 0));

    let stdout = "";
    let failed = false;
    try {
      await execFileP(process.execPath, [TTS, "generate", "--cues", cues, "--out", path.join(dir, "out")], { cwd: ROOT, env });
    } catch (error) {
      failed = true;
      stdout = (error as { stdout: string }).stdout;
    }
    expect(failed).toBe(true);

    const measured = countFromStdout(stdout);
    expect(measured.billedCues).toBe(2);
    expect(measured.billed).toBe([...texts[0]].length + [...texts[1]].length);

    const before = elevenLabsCost(MODEL, forecast, null, null);
    const after = elevenLabsCost(MODEL, billedCharacters(measured.done, measured.billed, measured.billedCues), null, null);
    expect(before.costUsd!).toBeGreaterThan(after.costUsd!);
    expect(after.costUsd).toBeCloseTo((measured.billed * 0.05) / 1000, 6);

    fake.server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it("(c) mọi câu lấy từ cache là 0 thật; có request mà không có dòng tính phí thì để trống", async () => {
    const nonce = `${Date.now().toString(36)}-c`;
    const text = `Câu sẽ vào cache ${nonce}`;
    const { dir, cues } = fixture([text]);
    const fake = await fakeElevenLabs(() => ({ cost: [...text].length, alignment: true }));
    const env = envFor(dir, fake.base);
    const generate = () => execFileP(process.execPath, [TTS, "generate", "--cues", cues, "--out", path.join(dir, "out")], { cwd: ROOT, env });

    await generate();
    const again = await generate();
    expect(fake.seen).toHaveLength(1);
    const cached = countFromStdout(again.stdout);
    expect(cached).toEqual({ done: 0, billed: 0, billedCues: 0 });
    expect(elevenLabsCost(MODEL, billedCharacters(cached.done, cached.billed, cached.billedCues), null, null))
      .toMatchObject({ characters: 0, costUsd: 0, costSource: "server_price_estimate" });

    // Dòng đã gửi nhưng parser không đọc được (định dạng tts.mjs đổi, hoặc chết giữa request).
    const drifted = countFromStdout("câu 01 → ElevenLabs … 1.00 s · charged 240 chars");
    expect(drifted).toEqual({ done: 1, billed: 0, billedCues: 0 });
    const unmeasured = elevenLabsCost(MODEL, billedCharacters(drifted.done, drifted.billed, drifted.billedCues), null, null);
    expect(unmeasured.costUsd).toBeUndefined();
    expect(unmeasured.costSource).toBeUndefined();

    fake.server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});
