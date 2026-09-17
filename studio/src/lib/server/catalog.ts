import fs from "node:fs";
import path from "node:path";
import type { CharacterDef, Library, LibraryGroup, StyleDef, VoiceCatalog, VoiceDef } from "../types";
import { mediaAsset, styleSample } from "./media";
import { DS, exists, REPO, STYLES } from "./paths";

/** A styles/*.json as written on disk: `sampleVideo` is a media key there, a resolved asset in StyleDef. */
type StyleFile = Omit<StyleDef, "sampleVideo"> & { sampleVideo?: string | null };

/** Component groups that exist only in Lesson Lab Style (the old 9-color set had none of them). */
const LAB_GROUPS = new Set(["brand", "code", "context", "control", "loop", "system", "table", "ui"]);
const LAB_COMPONENTS = new Set(["Magnifier", "SourceCard", "LineIcon", "Icon", "IllustrativeStamp"]);

export function listStyles(): StyleDef[] {
  if (!exists(STYLES)) return [];
  const raw = fs.readdirSync(STYLES).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(STYLES, f), "utf8")) as StyleFile);
  const byId = new Map(raw.map((s) => [s.id, s]));
  return raw
    .map((s): StyleDef => {
      const parent = s.extends ? byId.get(s.extends) : undefined;
      const style = { ...s, sampleVideo: styleSample(s.id, s.sampleVideo) };
      return parent ? { ...style, base: { name: parent.name, palette: parent.palette, showcase: parent.showcase } } : style;
    })
    .sort((a, b) => a.order - b.order);
}

/** voices.json as written on disk: `sample` is a media key there, a resolved asset in VoiceDef. */
type VoiceFile = Omit<VoiceDef, "sample" | "isDefault"> & { sample?: string | null; default?: boolean };

const CATALOG = path.join(REPO, "voices.json");

export function listVoices(): VoiceCatalog {
  if (!exists(CATALOG)) return { sampleText: "", voices: [], characters: [] };
  const raw = JSON.parse(fs.readFileSync(CATALOG, "utf8")) as { sampleText?: string; voices?: VoiceFile[]; characters?: CharacterDef[] };
  return {
    sampleText: raw.sampleText || "",
    characters: (raw.characters || []).map((c) => ({ ...c, avatarUrl: c.avatar ? mediaAsset(c.avatar)?.url ?? null : null })),
    voices: (raw.voices || []).map((v) => ({
      ...v,
      sample: v.sample ? mediaAsset(v.sample) : null,
      isDefault: v.default === true,
    })),
  };
}

/** What a new video starts with. Empty when the catalog names no default — then the studio must ask. */
export const defaultVoiceId = () => listVoices().voices.find((v) => v.isDefault)?.id || "";

export function getLibrary(): Library {
  const config = JSON.parse(fs.readFileSync(path.join(REPO, ".design-sync/config.json"), "utf8")) as {
    docsMap?: Record<string, string>;
    componentSrcMap?: Record<string, string | null>;
  };
  const groups = new Map<string, LibraryGroup>();
  const componentsDir = path.join(DS, "components");
  for (const d of fs.readdirSync(componentsDir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const card = path.join(componentsDir, d.name, "card.html");
    groups.set(d.name, { id: d.name, card: exists(card) ? `components/${d.name}/card.html` : null, components: [] });
  }
  for (const [name, doc] of Object.entries(config.docsMap || {})) {
    const m = doc.match(/^components\/([^/]+)\//);
    if (!m) continue;
    const group = groups.get(m[1]);
    if (!group) continue;
    const image = `${m[1]}__${name}.png`;
    group.components.push({
      name,
      group: m[1],
      doc,
      image: exists(path.join(STYLES, "previews", image)) ? image : null,
      lab: LAB_GROUPS.has(m[1]) || LAB_COMPONENTS.has(name),
    });
  }
  for (const g of groups.values()) g.components.sort((a, b) => a.name.localeCompare(b.name));
  const videosDir = path.join(DS, "ui_kits/lesson-video/videos");
  const videos = exists(videosDir)
    ? fs.readdirSync(videosDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && exists(path.join(videosDir, d.name, "player.html")))
        .map((d) => ({ id: d.name, player: `ui_kits/lesson-video/videos/${d.name}/player.html` }))
    : [];
  return { groups: [...groups.values()].filter((g) => g.components.length).sort((a, b) => a.id.localeCompare(b.id)), videos };
}

export function componentDoc(doc: string) {
  if (!/^components\/[a-z]+\/[A-Za-z]+\.prompt\.md$/.test(doc)) return null;
  const file = path.join(DS, doc);
  return exists(file) ? fs.readFileSync(file, "utf8") : null;
}
