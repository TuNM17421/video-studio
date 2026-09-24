import fs from "node:fs";
import path from "node:path";
import type { ModuleDef, ModuleInfo } from "../modules";
import { mediaAsset } from "./media";
import { exists, REPO } from "./paths";

/**
 * The capability catalog, read from `templates/modules/<id>.md`. Each file is both the guide a script
 * writer follows when the capability is on and the card the plan form shows — so adding a capability is
 * adding one file. The front matter names the card; the body is the guide.
 */
const DIR = path.join(REPO, "templates", "modules");
const ID = /^[a-z0-9-]+$/;

/** `key: value` lines between the leading `---` fences. Deliberately tiny: no nesting, no lists. */
export function frontMatter(text: string): Record<string, string> {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return out;
}

export function listModules(): ModuleDef[] {
  if (!exists(DIR)) return [];
  const list: (ModuleDef & { order: number })[] = [];
  for (const file of fs.readdirSync(DIR)) {
    if (!file.endsWith(".md")) continue;
    const id = file.slice(0, -3);
    // README.md and anything else that is not a valid id is documentation, not a capability.
    if (!ID.test(id)) continue;
    let text: string;
    try {
      text = fs.readFileSync(path.join(DIR, file), "utf8");
    } catch {
      // Removed between readdir and read (someone deleting a capability while the studio runs): skip it.
      continue;
    }
    const meta = frontMatter(text);
    if (!meta.name) continue;
    list.push({
      id,
      name: meta.name,
      summary: meta.summary ?? "",
      icon: meta.icon ?? "",
      template: `templates/modules/${file}`,
      previewKey: meta.preview || undefined,
      order: Number.isFinite(Number(meta.order)) && meta.order !== "" ? Number(meta.order) : 100,
    });
  }
  return list.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)).map(({ order: _order, ...m }) => m);
}

/** The catalog with sample videos resolved to URLs — the form cannot reach the media manifest itself. */
export function moduleInfos(): ModuleInfo[] {
  return listModules().map((m) => {
    const asset = m.previewKey ? mediaAsset(m.previewKey) : null;
    return { ...m, preview: asset ? { url: asset.url, type: asset.type } : null };
  });
}

export const moduleById = (id: string) => listModules().find((m) => m.id === id);
export const isModuleId = (value: unknown): value is string => typeof value === "string" && listModules().some((m) => m.id === value);
/** Drops unknown and duplicate ids — this list goes straight into REQUEST.md. */
export const cleanModules = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const known = new Set(listModules().map((m) => m.id));
  return [...new Set(value.filter((v): v is string => typeof v === "string" && known.has(v)))];
};

/** The `## Tiêu chí QA` section of a capability's file: what visual QA checks only when it is on. */
export function qaSection(text: string) {
  const m = text.match(/^##\s+Tiêu chí QA\s*$([\s\S]*?)(?=^##\s|(?![\s\S]))/m);
  return m ? m[1].replace(/^\s*---\s*$/gm, "").trim() : "";
}

/** QA criteria of the chosen capabilities, as `{ name, criteria }`; capabilities without the section drop out. */
export function moduleQaCriteria(ids: string[]) {
  return ids.flatMap((id) => {
    const m = moduleById(id);
    if (!m) return [];
    const criteria = qaSection(fs.readFileSync(path.join(REPO, m.template), "utf8"));
    return criteria ? [{ name: m.name, criteria }] : [];
  });
}
