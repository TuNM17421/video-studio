import type { QaFindingItem, VideoState } from "../types";
import { blockingFeedback as ledgerBlocking, readFeedback as ledgerFeedback } from "../../../../tools/workflow-ledger.mjs";
import { REPO } from "./paths";

export {
  addRunMetrics,
  QA_CODES,
  blockingFeedback,
  finishRun,
  readFeedback,
  readRuns,
  recordFeedback,
  reconcileQaFeedback,
  startRun,
  updateFeedback,
  updateFeedbackWhere,
  workflowReport,
  writeImprovementPlan,
} from "../../../../tools/workflow-ledger.mjs";


/**
 * What stops the Duyệt button for a stage — one rule for the approve API and the page. With cross-review
 * switched off, its findings are informational and only the user's own feedback blocks.
 */
export function blockersFor(id: string, stage: "cues" | "scenes", state: VideoState): { source: string; severity: string; scope?: string; code?: string; message: string }[] {
  return ledgerBlocking(REPO, id, stage).filter((item: { source: string }) => state.review.enabled || item.source !== "qa");
}

/** Every cross-review finding on the scenes stage, newest first within each severity. */
export function qaFindings(id: string): QaFindingItem[] {
  return ledgerFeedback(REPO, id).filter((item: { source: string; stage: string }) => item.source === "qa" && item.stage === "scenes");
}
