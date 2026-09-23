/**
 * The manifest.json that goes next to every MP4 sent to the QA platform. The file itself is written by
 * tools/qa-manifest.mjs (delivered by the QA team, rules in tools/lib/qa-manifest.mjs); this module only
 * holds what the Studio UI needs to ask the two things the repo cannot work out on its own.
 *
 * `item_id` — the code the platform files every QA finding under. We default it to the video id, which is
 * what this course uses; the platform's own schema caps it at 32 characters, so the plan step warns past
 * that rather than letting an upload be rejected later.
 *
 * `build_no` — which round of review this MP4 is. Not derivable from how many times render ran: a render
 * repeated after a crash is still the same round, and only the person sending it knows.
 */
export const ITEM_ID_MAX = 32;

export type BuildNo = 1 | 2 | 3;

export const BUILD_OPTIONS: { value: BuildNo; label: string; hint: string }[] = [
  { value: 1, label: "Gửi soát lần đầu", hint: "Bản đầu tiên đưa cho đội QA" },
  { value: 2, label: "Gửi lại sau sửa", hint: "Đã sửa theo góp ý của lượt soát trước" },
  { value: 3, label: "Bản phát hành", hint: "Bản cuối, dùng để đăng" },
];

export const DEFAULT_BUILD_NO: BuildNo = 1;

export const buildLabel = (n: BuildNo) => BUILD_OPTIONS.find((o) => o.value === n)?.label ?? `Bản ${n}`;

export const isBuildNo = (value: unknown): value is BuildNo => value === 1 || value === 2 || value === 3;

/** The id actually sent as `item_id`: what the plan step stored, else the video's own id. */
export const itemIdFor = (itemId: string, videoId: string) => (itemId.trim() || videoId);
