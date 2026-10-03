import { describe, expect, it } from "vitest";
import { SHELL_RULES_LINE } from "./agent";

describe("quy tắc shell dặn agent", () => {
  it("cấm đúng hai dạng lệnh allowlist từ chối: `cd <dir> && …` và `node -e`", () => {
    expect(SHELL_RULES_LINE).toMatch(/KHÔNG `cd`/);
    expect(SHELL_RULES_LINE).toMatch(/KHÔNG `node -e`/);
  });

  it("chỉ nêu những lệnh có trong allowlist, và đường dẫn bắt đầu bằng tools/", () => {
    for (const ok of ["node tools/<script>", "ls", "mkdir", "cp", "mv", "wc", "head", "sort"]) expect(SHELL_RULES_LINE).toContain(ok);
    expect(SHELL_RULES_LINE).not.toMatch(/npm run|git /);
  });
});
