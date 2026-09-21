/**
 * Which DayNN a script belongs to, read from its filename and header. The plan form used to default
 * to a fixed day and a Ngày 1 video was delivered into Day02/ because nobody changed it; the script
 * itself nearly always says which day it is, so the form prefills from it and flags a mismatch.
 */

const HEAD_LINES = 40;
/** The plan form offers Day01–Day30; a number past that is not a lesson day. */
const LAST_DAY = 30;

/** Each pattern captures the day number; tried in this order on one piece of text. */
const PATTERNS: RegExp[] = [
  // "ngày 01", "Ngày 1", "**Ngày:** 1", "ngay-01", "ngay01", "day-01", "Day 1" — but not "video-01",
  // "Monday 3", "5 ngày" or a date: "Ngày 15/3", "ngày 7-9-2026", "ngày 7 tháng 9".
  /(?<![\p{L}\p{N}])(?:ngày|ngay|day)[\s_\-:*]*(\d{1,2})(?![\p{N}/]|[-.]\d|\s*(?:tháng|thang)(?![\p{L}]))/iu,
  // Lesson codes "N1-01" / "N01-02": the number after N is the day.
  /(?<![\p{L}\p{N}])N(\d{1,2})-\d{1,2}(?![\p{N}])/iu,
  // "D01" — two digits and upper-case only, so a video id such as "d1" or "d2-01-lab" stays an id.
  /(?<![\p{L}\p{N}])D(\d{2})(?![\p{N}])/u,
];

function dayIn(text: string): string | null {
  for (const re of PATTERNS) {
    const match = re.exec(text);
    if (!match) continue;
    const n = Number(match[1]);
    if (n >= 1 && n <= LAST_DAY) return `Day${String(n).padStart(2, "0")}`;
  }
  return null;
}

/** The "DayNN" a script names — filename first, then its first lines — or null when neither says. */
export function inferDay(name: string, content: string): string | null {
  const head = content.split(/\r?\n/, HEAD_LINES).join("\n");
  return dayIn(name.normalize("NFC")) ?? dayIn(head.normalize("NFC"));
}
