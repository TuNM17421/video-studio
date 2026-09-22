import { describe, expect, it } from "vitest";
import { isKaggleDir, parseKernelStatus } from "./voice";

describe("parseKernelStatus", () => {
  it("reads both the plain and the KernelWorkerStatus enum form the CLI prints", () => {
    expect(parseKernelStatus('thai/vs-a-voice has status "running"')).toBe("running");
    expect(parseKernelStatus('thai/vs-a-voice has status "KernelWorkerStatus.COMPLETE"')).toBe("complete");
    expect(parseKernelStatus('thai/vs-a-voice has status "KernelWorkerStatus.ERROR"\nFailure message: "x"')).toBe("error");
    expect(parseKernelStatus('thai/vs-a-voice has status "KernelWorkerStatus.CANCEL_REQUESTED"')).toBe("cancelled");
    expect(parseKernelStatus('thai/vs-a-voice has status "KernelWorkerStatus.NEW_SCRIPT"')).toBe("queued");
  });

  it("does not mistake the word 'error' outside the status line for a failed kernel", () => {
    // The first cut searched the whole output (stderr included) for "error", so a warning ended the run.
    expect(parseKernelStatus('Warning: error reporting is deprecated\nthai/vs-error-voice has status "KernelWorkerStatus.RUNNING"')).toBe("running");
    expect(parseKernelStatus("Warning: Looks like you're using an outdated API Version")).toBeNull();
  });

  it("reports a status it does not know instead of guessing", () => {
    expect(parseKernelStatus('x has status "KernelWorkerStatus.SOMETHING_NEW"')).toBe("unknown");
  });
});

describe("isKaggleDir", () => {
  it("recognises the folder Studio downloads the kernel output into, on any OS", () => {
    expect(isKaggleDir("/repo/projects/d2-01/voice-script/kaggle/out")).toBe(true);
    expect(isKaggleDir("C:\\repo\\projects\\d2-01\\voice-script\\kaggle\\out")).toBe(true);
    expect(isKaggleDir("/repo/projects/d2-01/voice-script/omnivoice")).toBe(false);
    expect(isKaggleDir("/home/me/recorded")).toBe(false);
  });
});
