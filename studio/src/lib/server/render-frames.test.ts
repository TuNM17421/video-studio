import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { clearFramesDir, frameFingerprint, prepareFramesDir } from "./render-frames";

const roots: string[] = [];

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "render-frames-test-"));
  roots.push(root);
  const videoDir = path.join(root, "videos", "v1");
  const bundle = path.join(root, "dist", "vk.js");
  for (const [file, text] of [[path.join(videoDir, "cues.js"), "cues"], [path.join(videoDir, "img", "a.png"), "img"], [bundle, "bundle"]]) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
  const inputs = { videoDir, shared: [bundle], captions: true, fps: 60 };
  const frames = path.join(root, "render", "frames");
  const shoot = (n: number) => { for (let i = 0; i < n; i++) fs.writeFileSync(path.join(frames, `f${String(i).padStart(6, "0")}.png`), "png"); };
  return { videoDir, bundle, inputs, frames, shoot };
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("frameFingerprint", () => {
  it("đổi khi cảnh, ảnh trong thư mục con, bundle, phụ đề hoặc fps đổi", () => {
    const { videoDir, bundle, inputs } = fixture();
    const base = frameFingerprint(inputs);
    expect(frameFingerprint(inputs)).toBe(base);
    expect(frameFingerprint({ ...inputs, captions: false })).not.toBe(base);
    expect(frameFingerprint({ ...inputs, fps: 30 })).not.toBe(base);
    fs.writeFileSync(path.join(videoDir, "img", "a.png"), "img2");
    const afterImage = frameFingerprint(inputs);
    expect(afterImage).not.toBe(base);
    fs.writeFileSync(bundle, "bundle2");
    expect(frameFingerprint(inputs)).not.toBe(afterImage);
  });
});

describe("prepareFramesDir", () => {
  it("giữ frame của lần dở trước khi hình chưa đổi", () => {
    const { inputs, frames, shoot } = fixture();
    expect(prepareFramesDir(frames, frameFingerprint(inputs))).toEqual({ reusable: 0, discarded: false });
    shoot(3);
    fs.writeFileSync(path.join(frames, "f000003.png.part"), "cụt");
    expect(prepareFramesDir(frames, frameFingerprint(inputs))).toEqual({ reusable: 3, discarded: false });
    expect(fs.existsSync(path.join(frames, "f000002.png"))).toBe(true);
  });

  it("xoá sạch frame cũ khi cảnh đã sửa", () => {
    const { videoDir, inputs, frames, shoot } = fixture();
    prepareFramesDir(frames, frameFingerprint(inputs));
    shoot(3);
    fs.writeFileSync(path.join(videoDir, "cues.js"), "cues sửa");
    expect(prepareFramesDir(frames, frameFingerprint(inputs))).toEqual({ reusable: 0, discarded: true });
    expect(fs.readdirSync(frames)).toEqual([".fingerprint"]);
  });

  it("không tin thư mục frame không có vân tay", () => {
    const { inputs, frames, shoot } = fixture();
    fs.mkdirSync(frames, { recursive: true });
    shoot(2);
    expect(prepareFramesDir(frames, frameFingerprint(inputs)).reusable).toBe(0);
    expect(fs.readdirSync(frames)).toEqual([".fingerprint"]);
    clearFramesDir(frames);
    expect(fs.existsSync(frames)).toBe(false);
  });
});
