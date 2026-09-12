import { describe, expect, it } from "vitest";
import type { Manifest } from "./media";
import { resolveMedia, resolveStyleSample } from "./media";

const manifest: Manifest = {
  base: "https://pub-abc.r2.dev/",
  assets: {
    "styles/lesson/sample.mp4": { type: "video/mp4", bytes: 12_000_000, sha256: "abcdef0123456789" },
    "styles/lesson-lab/sample.mp3": { type: "audio/mpeg", bytes: 900_000 },
    "styles/lesson-lab/sample/extra.mp4": { type: "video/mp4", bytes: 10 },
    "clips/cảnh mở.mp4": { type: "video/mp4", bytes: 10 },
  },
};

describe("media manifest", () => {
  it("builds a public URL from the base and the key", () => {
    expect(resolveMedia(manifest, "styles/lesson/sample.mp4")?.url).toBe("https://pub-abc.r2.dev/styles/lesson/sample.mp4?v=abcdef012345");
  });

  it("fingerprints the URL so a replaced file is never served from a stale cache", () => {
    const changed = { ...manifest, assets: { ...manifest.assets, "styles/lesson/sample.mp4": { type: "video/mp4", bytes: 1, sha256: "999888777666" } } };
    expect(resolveMedia(changed, "styles/lesson/sample.mp4")?.url).not.toBe(resolveMedia(manifest, "styles/lesson/sample.mp4")?.url);
    // An entry pushed before hashes were recorded still resolves, just without the query.
    const old = { ...manifest, assets: { "a/b.mp4": { type: "video/mp4", bytes: 1 } } };
    expect(resolveMedia(old, "a/b.mp4")?.url).toBe("https://pub-abc.r2.dev/a/b.mp4");
  });

  it("escapes a key without escaping its separators", () => {
    expect(resolveMedia(manifest, "clips/cảnh mở.mp4")?.url).toBe("https://pub-abc.r2.dev/clips/c%E1%BA%A3nh%20m%E1%BB%9F.mp4");
  });

  it("treats a key that was never pushed as absent", () => {
    expect(resolveMedia(manifest, "styles/lesson/missing.mp4")).toBeNull();
  });

  it("stays silent until the bucket has a public base", () => {
    expect(resolveMedia({ ...manifest, base: "" }, "styles/lesson/sample.mp4")).toBeNull();
  });

  it("finds a style's sample by convention, whatever the extension", () => {
    expect(resolveStyleSample(manifest, "lesson", null)?.key).toBe("styles/lesson/sample.mp4");
    expect(resolveStyleSample(manifest, "lesson-lab", null)?.type).toBe("audio/mpeg");
  });

  it("does not mistake a file nested under sample/ for the sample itself", () => {
    expect(resolveStyleSample({ ...manifest, assets: { "styles/x/sample/extra.mp4": { type: "video/mp4", bytes: 10 } } }, "x", null)).toBeNull();
  });

  it("lets styles/*.json name a key explicitly", () => {
    expect(resolveStyleSample(manifest, "lesson", "styles/lesson-lab/sample.mp3")?.key).toBe("styles/lesson-lab/sample.mp3");
  });

  it("has no sample for a style nothing was pushed for", () => {
    expect(resolveStyleSample(manifest, "chưa-có", null)).toBeNull();
  });
});
