import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { STUDIO_LAYOUT } from "./design-tokens";

// Token bố cục khai hai nơi: bảng ở design-tokens.ts (trang /design-system đọc) và biến CSS trong vinuni-tokens.css
// (giao diện dùng). Lệch nhau thì trang hướng dẫn nói một cỡ, giao diện vẽ cỡ khác.
const CSS = fs.readFileSync(path.join(__dirname, "..", "app", "vinuni-tokens.css"), "utf8");
const RESEARCH_VARS: Record<string, string> = {
  "research.sources": "--vu-research-sources-width",
  "research.header": "--vu-research-header-height",
  "research.strip": "--vu-research-strip-height",
  "research.strip.node.min": "--vu-research-node-min",
  "research.strip.node.max": "--vu-research-node-max",
  "research.strip.node.height": "--vu-research-node-height",
  "research.strip.gate": "--vu-research-gate",
  "research.drawer": "--vu-research-drawer-width",
  "research.sheet": "--vu-research-sheet-height",
};

describe("token bố cục của trang Đóng gói kịch bản", () => {
  it("mỗi dòng research.* trong bảng khớp biến CSS của nó", () => {
    const rows = STUDIO_LAYOUT.filter((r) => r.token.startsWith("research."));
    expect(rows.map((r) => r.token).sort()).toEqual(Object.keys(RESEARCH_VARS).sort());
    for (const row of rows) {
      const m = new RegExp(`${RESEARCH_VARS[row.token]}:\s*([^;]+);`).exec(CSS);
      expect(m, row.token).not.toBeNull();
      expect(m![1].trim().replace(/\s+/g, "")).toBe(row.value.replace(/\s+/g, ""));
    }
  });
});
