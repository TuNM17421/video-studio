import { describe, expect, it } from "vitest";
import { QA_CODES } from "../../../tools/workflow-ledger.mjs";
import { cueNumber, QA_CODE_LABELS } from "./qa-codes";

describe("QA code labels", () => {
  it("names every code the ledger accepts, and nothing else", () => {
    expect(Object.keys(QA_CODE_LABELS).sort()).toEqual([...QA_CODES].sort());
  });

  it("reads the cue number off a finding's scope", () => {
    expect(cueNumber("cue-03")).toBe(3);
    expect(cueNumber("verify.txt")).toBeNull();
  });
});
