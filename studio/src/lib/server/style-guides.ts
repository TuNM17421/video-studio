import fs from "node:fs";
import path from "node:path";
import { frontMatter, qaSection } from "./modules";
import { exists, STYLES } from "./paths";

/**
 * Style guides: `styles/<id>.md` next to `styles/<id>.json` — how that style builds its scenes, which the
 * core skill (.claude/skills/make-video/SKILL.md) defers to. A guide may say `extends: <parent>` in its front
 * matter; then the parent's guide is read first and this one only adds. That chain is the guide's own, not
 * the JSON's `extends`: the whiteboard borrows Lesson's palette but none of its scene rules.
 */
const ID = /^[a-z0-9-]+$/;
const guideFile = (id: string) => path.join(STYLES, `${id}.md`);

/** The style's guides, parent first, as repo-relative paths (`styles/lesson.md`, `styles/lesson-lab.md`). */
export function styleGuides(id: string): string[] {
  const chain: string[] = [];
  let current: string | undefined = id;
  while (current && ID.test(current) && !chain.includes(current) && exists(guideFile(current))) {
    chain.unshift(current);
    current = frontMatter(fs.readFileSync(guideFile(current), "utf8")).extends || undefined;
  }
  return chain.map((s) => `styles/${s}.md`);
}

/** The `## Tiêu chí QA` sections of the style's guides, as `{ name, criteria }` like the capabilities'. */
export function styleQaCriteria(id: string) {
  return styleGuides(id).flatMap((rel) => {
    const criteria = qaSection(fs.readFileSync(path.join(STYLES, path.basename(rel)), "utf8"));
    return criteria ? [{ name: `Style · ${path.basename(rel, ".md")}`, criteria }] : [];
  });
}

/** One line for REQUEST.md and the agent prompt: which guides to read, in order. */
export function styleGuideLine(id: string) {
  const guides = styleGuides(id);
  if (!guides.length) return null;
  return `Hướng dẫn dựng cảnh của style: đọc ${guides.map((g) => `\`${g}\``).join(" rồi ")}${guides.length > 1 ? " (file sau chỉ ghi phần thêm)" : ""}.`;
}
