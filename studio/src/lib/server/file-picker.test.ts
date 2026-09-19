import { describe, expect, it } from "vitest";
import { filePickerArgs, windowsPickerScript } from "./file-picker";

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

describe("windows file picker (PowerShell)", () => {
  it("opens a video-filtered file dialog for one old video", () => {
    const script = windowsPickerScript("file", "video");
    expect(script).toContain("OpenFileDialog");
    expect(script).toContain("Title = 'Chọn video cũ'");
    expect(script).toContain("*.mp4;*.mov");
    expect(script).toContain("Multiselect = $false");
    expect(script).not.toContain("FolderBrowserDialog");
  });

  it("opens a folder chooser for a feedback folder", () => {
    const script = windowsPickerScript("directory", "feedback");
    expect(script).toContain("FolderBrowserDialog");
    expect(script).toContain("Description = 'Chọn feedback bản cũ'");
    expect(script).toContain("SelectedPath");
    expect(script).not.toContain("OpenFileDialog");
  });

  it("prints the path as UTF-8 so Vietnamese folder names survive", () => {
    expect(windowsPickerScript("file", "video")).toContain("[Console]::OutputEncoding = [System.Text.Encoding]::UTF8");
  });

  // Runs the real script through PowerShell with the dialog stubbed to "Cancel": proves it parses and
  // reaches ShowDialog without ever putting a window on the tester's screen.
  it.skipIf(process.platform !== "win32")("is valid PowerShell (dialog stubbed, no window)", async () => {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    for (const kind of ["file", "directory"] as const) {
      const stubbed = windowsPickerScript(kind, "video").replace(/\$d\.ShowDialog\(\$owner\)/, "[System.Windows.Forms.DialogResult]::Cancel");
      const encoded = Buffer.from(stubbed, "utf16le").toString("base64");
      const { stdout, stderr } = await promisify(execFile)("powershell.exe", ["-NoProfile", "-NonInteractive", "-STA", "-EncodedCommand", encoded], { encoding: "utf8", timeout: 60_000, windowsHide: true });
      // stdout is the contract (a path, or nothing on cancel); stderr may carry CLIXML noise but never an Error stream.
      expect(stderr).not.toMatch(/<S S="Error">/);
      expect(stdout.trim()).toBe("");
    }
  });
});
