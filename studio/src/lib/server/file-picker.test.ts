import { describe, expect, it } from "vitest";
import { filePickerArgs } from "./file-picker";

describe("desktop file picker", () => {
  it("opens a directory chooser for a feedback folder", () => {
    const args = filePickerArgs("directory", "feedback");
    expect(args).toContain("--directory");
    expect(args).toContain("--title=Chọn feedback bản cũ");
  });

  it("filters common formats when choosing one old video", () => {
    const args = filePickerArgs("file", "video");
    expect(args).not.toContain("--directory");
    expect(args).toContain("--file-filter=Video | *.mp4 *.mov *.webm *.mkv *.avi");
  });
});
