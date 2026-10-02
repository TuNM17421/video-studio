/** Optional transcripts must never interrupt usage accounting or job/resource cleanup. */
export const AI_LOG_MAX_BYTES = 256 * 1024;
const MARKER = "\n[AI log truncated at 256 KiB]";

export function boundedAiLog(text: string): string {
  const bytes = Buffer.from(text, "utf8");
  if (bytes.length <= AI_LOG_MAX_BYTES) return text;
  let end = AI_LOG_MAX_BYTES - Buffer.byteLength(MARKER);
  // Do not split a UTF-8 code point (replacement characters could exceed the byte budget).
  while ((bytes[end] & 0xc0) === 0x80) end--;
  return bytes.subarray(0, end).toString("utf8") + MARKER;
}

export function safelyRecordAiLog(text: string, write: (text: string) => unknown, warn: (message: string) => void) {
  try {
    const bounded = boundedAiLog(text);
    write(bounded);
    if (bounded !== text) warn("AI log đã cắt ở giới hạn 256 KiB.");
  } catch {
    // Do not echo writer errors: they can include filesystem paths or credential material.
    warn("Không ghi được AI log; kiểm tra key base64 32 byte và quyền ghi. Job vẫn tiếp tục.");
  }
}
