import fs from "node:fs";
import path from "node:path";
import type { AgentProvider, VideoRequest, VideoState } from "@/lib/types";
import { agentProviderLabel } from "@/lib/agent-providers";
import { SILENT } from "@/lib/music";
import { DEFAULT_BUILD_NO, ITEM_ID_MAX } from "@/lib/qa-manifest";
import { normalizeReview } from "@/lib/review";
import { defaultBackground } from "@/lib/server/music";
import { readAgentConfig, resolveAgentProvider, reviewDefaults } from "@/lib/server/agent-config";
import { handle } from "@/lib/server/http";
import { assertId, DAY_RE, exists, HttpError, projectDir, STYLES, videoDir } from "@/lib/server/paths";
import { cleanModules, isModuleId } from "@/lib/server/modules";
import { listVideos, newVoice, requestMarkdown, writeState } from "@/lib/server/videos";

export const GET = handle(() => Response.json(listVideos()));

/** Create a video: projects/<id>/{kich-ban-goc.md, REQUEST.md} + the studio state. Nothing runs yet. */
export const POST = handle(async (req: Request) => {
  const body = (await req.json()) as { id: string; request: VideoRequest; script: { name: string; content: string }; agentProvider?: unknown; voiceId?: string; review?: unknown };
  const id = String(body.id || "").trim();
  assertId(id);
  const r = body.request;
  if (exists(projectDir(id)) || exists(videoDir(id))) throw new HttpError(409, `Đã có video ${id}. Chọn mã khác.`);
  if (!DAY_RE.test(r.day)) throw new HttpError(400, "Ngày phải có dạng Day01, Day02…");
  if (!exists(path.join(STYLES, `${r.style}.json`))) throw new HttpError(400, "Style không tồn tại.");
  const content = String(body.script?.content || "");
  if (!content.trim()) throw new HttpError(400, "Thêm kịch bản trước.");
  if (content.length > 300_000) throw new HttpError(400, "Kịch bản quá dài (tối đa 300.000 ký tự).");
  let provider: AgentProvider;
  try {
    provider = resolveAgentProvider(body.agentProvider, readAgentConfig());
  } catch (error) {
    throw new HttpError(400, error instanceof Error ? error.message : "Agent không hợp lệ.");
  }
  for (const [label, dir] of [["Feedback", r.feedbackDir], ["Video cũ", r.oldVideoDir]] as const) {
    if (dir && (!path.isAbsolute(dir) || !exists(dir))) throw new HttpError(400, `${label}: không tìm thấy tệp hoặc thư mục ${dir}`);
  }
  // A typo'd capability must not pass as "none chosen" — the request file is what the agent obeys.
  const modules = cleanModules(r.modules);
  const unknown = (Array.isArray(r.modules) ? r.modules : []).filter((m) => !isModuleId(m));
  if (unknown.length) throw new HttpError(400, `Không có năng lực bổ sung: ${unknown.join(", ")}`);
  const request: VideoRequest = {
    style: r.style, modules, day: r.day, itemId: String(r.itemId || "").trim().slice(0, ITEM_ID_MAX),
    title: String(r.title || "").slice(0, 200), scriptName: String(body.script.name || "").slice(0, 200),
    feedbackDir: r.feedbackDir || "", oldVideoDir: r.oldVideoDir || "", notes: String(r.notes || "").slice(0, 5000),
    scope: { scenes: true, voice: !!r.scope.voice, render: !!r.scope.render, transcript: !!r.scope.transcript, chapters: !!r.scope.chapters },
  };
  fs.mkdirSync(path.join(projectDir(id), "render"), { recursive: true });
  fs.writeFileSync(path.join(projectDir(id), "render", ".gitkeep"), "");
  fs.writeFileSync(path.join(projectDir(id), "kich-ban-goc.md"), content.endsWith("\n") ? content : `${content}\n`);
  fs.writeFileSync(path.join(projectDir(id), "REQUEST.md"), requestMarkdown(id, request, agentProviderLabel(provider)));
  const now = new Date().toISOString();
  const state: VideoState = {
    id, createdAt: now, updatedAt: now, request, agent: { provider, sessionId: null },
    stages: { cues: "idle", voice: "idle", scenes: "idle", render: "idle", deliver: "idle" },
    voice: { ...newVoice(), ...(body.voiceId ? { voiceId: String(body.voiceId) } : {}) },
    // Both tracks are chosen at render; the bed starts on the catalog's default, the quiz track on none.
    music: { ...SILENT, background: defaultBackground() },
    captions: true,
    buildNo: DEFAULT_BUILD_NO,
    review: normalizeReview(body.review, reviewDefaults()),
    lastError: null,
  };
  writeState(state);
  return Response.json({ id }, { status: 201 });
});
