import type { JobInfo, LogEntry } from "./types";

/**
 * Đề xuất ảnh tư liệu (năng lực `images`, `templates/modules/images.md`) — kiểu dữ liệu dùng chung cho panel và
 * máy chủ.
 *
 * Nguồn sự thật là `projects/<id>/images/` trên đĩa, do các lệnh `tools/image-*.mjs` và skill `image-suggest` ghi
 * (xem `.claude/skills/image-suggest/SKILL.md`). Ở đây chỉ mô tả lại những gì panel cần đọc.
 */

export const IMAGES_MODULE = "images";

export type ImageAction = "use" | "reference" | "skip";

export const IMAGE_ACTION_LABEL: Record<ImageAction, string> = {
  use: "Dùng ảnh này",
  reference: "Dùng làm tham khảo",
  skip: "Bỏ, dùng animation",
};

/** Một ảnh tìm được — mọi chữ mô tả lấy từ metadata của nguồn, không do agent viết. */
export interface ImageCandidate {
  id: string;
  source: string;
  title: string | null;
  description: string | null;
  creator: string | null;
  date: string | null;
  license: string;
  licenseVersion: string | null;
  licenseUrl: string | null;
  landingUrl: string | null;
  width: number | null;
  height: number | null;
  /** Thumbnail, đường dẫn từ gốc repo (mở qua `/files/`). */
  thumb: string;
  lowRes: boolean;
  credit: string;
  /**
   * Ảnh đại diện của một trang research đã dẫn cho câu này (nguồn `research`): giấy phép không rõ, nên mặc định
   * chỉ dùng làm tham khảo — muốn dùng trong video thì người dựng tự kiểm trên trang nguồn và chọn giấy phép.
   */
  referenceOnly?: boolean;
  research?: { rid: string; sid: string; claim: string };
}

/** Ảnh agent chọn khi xếp hạng: `why` nói vì sao hợp với câu. */
export interface ImagePick {
  id: string;
  fit: "good" | "ok";
  why: string;
}

export interface ImageDecision {
  action: ImageAction;
  candidate?: string;
  caption?: string;
  /** Chỉ cho ảnh `referenceOnly` dùng trong video: giấy phép người dựng đã tự kiểm trên trang nguồn. */
  license?: ConfirmableLicense;
}

/** Giấy phép người dựng được xác nhận cho ảnh từ trang research — đúng những gì images.policy.json cho phép. */
export const CONFIRMABLE_LICENSES = ["pd", "cc0", "cc-by", "cc-by-sa"] as const;
export type ConfirmableLicense = (typeof CONFIRMABLE_LICENSES)[number];

/** Một chỗ trong video đáng có ảnh, cùng mọi thứ đã làm cho nó. */
export interface ImageSlot {
  slot: string;
  cues: number[];
  kind: "use" | "reference";
  subject: string;
  era: string | null;
  why: string;
  queries: string[];
  /** Mọi ứng viên còn lại sau khi lọc giấy phép (theo thứ tự tìm được). */
  candidates: ImageCandidate[];
  /** Xếp hạng của agent, tốt nhất trước; rỗng khi chưa xếp hạng hoặc không ảnh nào đạt. */
  picks: ImagePick[];
  ranked: boolean;
  /** Lý do không ảnh nào đạt (agent), khi `picks` rỗng sau xếp hạng. */
  none: string | null;
  rejected: { id: string; reason: string }[];
  /** Số ảnh bị loại vì giấy phép / không tải được thumbnail. */
  filtered: number;
  searched: boolean;
  searchErrors: string[];
  decision: ImageDecision | null;
  /** Ảnh đã đưa vào video (images.js), `src` tính từ gốc design system. */
  applied: { src: string; kind: "use" | "reference" } | null;
}

export type ImagesStatus = "idle" | "running" | "review" | "error";

export interface ImagesView {
  status: ImagesStatus;
  /** Chặng đang chạy hoặc vừa dừng: "chọn chỗ" · "tìm ảnh" · "xếp hạng". */
  phase: string | null;
  error: string | null;
  /** Lời đọc đã đổi sau khi chọn chỗ — nên chạy lại từ đầu. */
  stale: boolean;
  slots: ImageSlot[];
  problems: string[];
  warnings: string[];
  job: JobInfo | null;
  logs: LogEntry[];
  at: string | null;
}

/** Giấy phép đọc cho người: "CC BY-SA 4.0", "Public domain". */
export function licenseLabel(code: string, version: string | null) {
  const names: Record<string, string> = { pd: "Public domain", cc0: "CC0", "cc-by": "CC BY", "cc-by-sa": "CC BY-SA", unknown: "Chưa rõ giấy phép" };
  const name = names[code] ?? code.toUpperCase();
  return version && code.startsWith("cc-") ? `${name} ${version}` : name;
}

/** Share-alike: dùng được, nhưng điều khoản đi theo tác phẩm phái sinh — panel nhắc người dựng. */
export const isShareAlike = (code: string) => code === "cc-by-sa";
