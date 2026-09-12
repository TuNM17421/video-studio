import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { collectVideoTrashTargets, trashVideo, type TrashRoots } from "./trash-video";

const temporaryRoots: string[] = [];

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "video-trash-test-"));
  temporaryRoots.push(root);
  const roots: TrashRoots = { repo: path.join(root, "repo"), designSystem: path.join(root, "ds") };
  const video = "d3-delete-me";
  const files = [
    path.join(roots.repo, "projects", video, "render", `${video}.mp4`),
    path.join(roots.designSystem, "ui_kits/lesson-video/videos", video, "video.jsx"),
    path.join(roots.repo, "tts-elevenlabs/out", video, "voice.wav"),
    path.join(roots.repo, "transcripts/Day03", `${video}.txt`),
    path.join(roots.repo, "chapters/Day03", `${video}-chương.txt`),
    path.join(roots.repo, "chapters/Day03", "video-khac-chương.txt"),
  ];
  for (const file of files) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "fixture");
  }
  return { root, roots, video };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("video trash targets", () => {
  it("collects every video-owned location and excludes another video's files", () => {
    const { roots, video } = fixture();
    const targets = collectVideoTrashTargets(video, roots);
    expect(targets.map((target) => target.kind)).toEqual(["project", "scenes", "voice", "transcript", "chapters"]);
    expect(targets.some((target) => target.path.includes("video-khac"))).toBe(false);
  });

  it("moves the collected locations through the supplied trash adapter", async () => {
    const { root, roots, video } = fixture();
    const trash = path.join(root, "trash");
    fs.mkdirSync(trash);
    const moved = await trashVideo(video, roots, async (paths) => {
      paths.forEach((source, index) => fs.renameSync(source, path.join(trash, `${index}-${path.basename(source)}`)));
    });
    expect(moved).toHaveLength(5);
    expect(collectVideoTrashTargets(video, roots)).toEqual([]);
    expect(fs.readdirSync(trash)).toHaveLength(5);
  });
});
