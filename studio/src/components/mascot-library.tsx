"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Checkbox, Radio, Segmented, Select, Typography } from "antd";
import { dsUrl } from "@/lib/client";
import styles from "./library.module.css";

/** assets/mascot/griffin/poses.json — written by tools/griffin-assets.py together with the pictures. */
type MascotTable = {
  moods: Record<string, string>;
  poses: Record<string, { label: string; group: string; w: number; hx: number; moods: string[]; walk?: boolean }>;
  props: Record<string, { label: string; file: string; w: number; h: number; k?: number; worn?: boolean }>;
};

type Motion = "idle" | "float" | "none";

const ASSETS = "assets/mascot/griffin";
const asset = (name: string) => dsUrl(`${ASSETS}/${name}.png`);
const MOTIONS: { value: Motion; label: string }[] = [
  { value: "idle", label: "Thở" },
  { value: "float", label: "Bồng bềnh" },
  { value: "none", label: "Tĩnh" },
];

/** The JSX a scene would write for the current choice — defaults left out, as a scene would. */
function snippet(pose: string, mood: string, prop: string, motion: Motion, hop: boolean) {
  const attrs = ["x={1540}", "y={930}", "h={460}", "frame={T}"];
  if (pose !== "stand") attrs.push(`pose="${pose}"`);
  if (mood !== "neutral") attrs.push(`mood="${mood}"`);
  if (prop) attrs.push(`prop="${prop}"`);
  if (motion !== "idle") attrs.push(`motion="${motion}"`);
  if (hop) attrs.push("hops={[spokenAt(1, '…')]}");
  return `<Griffin ${attrs.join(" ")} />`;
}

/**
 * Library · Mascot: the Griffin pack as the design system draws it. The preview is a DS page (not a Studio
 * mock), driven through its URL hash so a new choice repaints without reloading; the pose × mood table and
 * the props come from poses.json, so a mood the designers add shows up here with no Studio change.
 */
export function MascotLibrary() {
  const [table, setTable] = useState<MascotTable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pose, setPose] = useState("stand");
  const [mood, setMood] = useState("happy");
  const [prop, setProp] = useState("");
  const [motion, setMotion] = useState<Motion>("idle");
  const [hop, setHop] = useState(true);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(dsUrl(`${ASSETS}/poses.json`))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status} ${r.statusText}`))))
      .then(setTable)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const moods = useMemo(() => Object.entries(table?.moods ?? {}), [table]);
  const poses = useMemo(() => Object.entries(table?.poses ?? {}), [table]);
  const groups = useMemo(() => [...new Set(poses.map(([, p]) => p.group))], [poses]);
  const drawn = poses.reduce((n, [, p]) => n + p.moods.length, 0);
  const current = table?.poses[pose];
  const moodDrawn = !current || current.moods.includes(mood);
  const hash = new URLSearchParams({ pose, mood, prop: prop || "none", motion, hop: hop ? "1" : "0" });
  const code = snippet(pose, mood, prop, motion, hop);
  const pick = (p: string, m?: string) => {
    setPose(p);
    if (m) setMood(m);
  };
  // the table and the props sit below the preview: picking there brings the preview back into view
  const show = () => stage.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });

  return <section className={styles.catalogPanel}>
    <header className={styles.catalogHeader}>
      <div>
        <span className={styles.sectionEyebrow}>Mascot index</span>
        <h1>Griffin VinUni</h1>
        <p>Linh vật dẫn dắt ở mở bài, chuyển đoạn và kết bài. Chọn tư thế, biểu cảm và đạo cụ để xem đúng cách video vẽ, rồi copy đoạn mã vào cảnh.</p>
      </div>
      <span className={styles.catalogTotal}><strong>{table ? `${drawn}/${poses.length * moods.length}` : "—"}</strong> ảnh tư thế × biểu cảm</span>
    </header>
    {error && <Alert className={styles.feedback} type="error" showIcon title="Không tải được bộ ảnh Griffin" description={`${error} — chạy lại tools/griffin-assets.py để sinh poses.json.`} />}

    {table && <>
      <div className={styles.mascotWorkbench}>
        <div ref={stage} className={styles.mascotStage}>
          <iframe title="Griffin xem thử" src={`${dsUrl("ui_kits/lesson-video/demos/mascot.html")}#${hash}`} tabIndex={-1} />
        </div>
        <div className={styles.mascotControls}>
          {groups.map((g) => <fieldset key={g} className={styles.mascotField}>
            <legend>{g}</legend>
            <Radio.Group
              optionType="button"
              size="small"
              value={pose}
              onChange={(e) => pick(e.target.value)}
              options={poses.filter(([, p]) => p.group === g).map(([id, p]) => ({ value: id, label: p.label }))}
            />
          </fieldset>)}
          <fieldset className={styles.mascotField}>
            <legend>Biểu cảm</legend>
            <Radio.Group
              optionType="button"
              size="small"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              options={moods.map(([id, label]) => ({ value: id, label, className: current?.moods.includes(id) ? undefined : styles.mascotUndrawn }))}
            />
            {!moodDrawn && current && <p className={styles.mascotNote}>
              <strong>{current.label}</strong> chưa vẽ biểu cảm này — video hiện ảnh mặc định ({table.moods[current.moods[0]]}) cho tới khi bộ ảnh bổ sung.
            </p>}
          </fieldset>
          <fieldset className={styles.mascotField}>
            <legend>Đạo cụ</legend>
            <Select
              className={styles.mascotSelect}
              value={prop}
              onChange={setProp}
              options={[{ value: "", label: "Không có" }, ...Object.entries(table.props).map(([id, p]) => ({ value: id, label: p.worn ? `${p.label} (đội lên đầu)` : p.label }))]}
            />
          </fieldset>
          <fieldset className={styles.mascotField}>
            <legend>Chuyển động</legend>
            <Segmented size="small" value={motion} onChange={(v) => setMotion(v as Motion)} options={MOTIONS} />
            <Checkbox checked={hop} onChange={(e) => setHop(e.target.checked)}>Nhảy một nhịp giữa vòng lặp</Checkbox>
          </fieldset>
          <div className={styles.mascotCode}>
            <span>Dùng trong cảnh</span>
            <Typography.Paragraph className={styles.mascotSnippet} copyable={{ text: code, tooltips: ["Copy", "Đã copy"] }}>{code}</Typography.Paragraph>
          </div>
        </div>
      </div>

      <div className={styles.mascotMatrix}>
        <div className={styles.mascotMatrixHead}>
          <h2>Tư thế × biểu cảm</h2>
          <p>Ô nét đứt là biểu cảm tư thế chưa có — cảnh gọi tới vẫn chạy, với ảnh mặc định của tư thế. Bấm một ô để xem thử.</p>
        </div>
        <div className={styles.mascotTableWrap}>
          <table className={styles.mascotTable}>
            <thead><tr><th scope="col">Tư thế</th>{moods.map(([id, label]) => <th key={id} scope="col">{label}<code>{id}</code></th>)}</tr></thead>
            <tbody>{poses.map(([id, p]) => <tr key={id}>
              <th scope="row">{p.label}<code>{id}</code></th>
              {moods.map(([m, label]) => {
                const has = p.moods.includes(m);
                const on = pose === id && mood === m;
                return <td key={m}>
                  <button
                    type="button"
                    className={`${styles.mascotCell} ${has ? "" : styles.mascotCellEmpty} ${on ? styles.mascotCellOn : ""}`}
                    aria-pressed={on}
                    aria-label={`${p.label} · ${label}${has ? "" : " (chưa vẽ)"}`}
                    onClick={() => {
                      pick(id, m);
                      show();
                    }}
                  >
                    {has ? <img src={asset(`${id}-${m}`)} alt="" loading="lazy" /> : <span>Chưa vẽ</span>}
                  </button>
                </td>;
              })}
            </tr>)}</tbody>
          </table>
        </div>
      </div>

      <div className={styles.mascotExtras}>
        <div>
          <h2>Đạo cụ <code>prop</code></h2>
          <ul>{Object.entries(table.props).map(([id, p]) => <li key={id}>
            <button type="button" className={`${styles.mascotChip} ${prop === id ? styles.mascotCellOn : ""}`} onClick={() => {
              setProp(prop === id ? "" : id);
              show();
            }} aria-pressed={prop === id}>
              <img src={asset(p.file)} alt="" />
            </button>
            <span>{p.label}</span><code>{id}</code>
          </li>)}</ul>
        </div>
        <div>
          <h2>Huy hiệu <code>GriffinBadge</code></h2>
          <ul>{moods.map(([id, label]) => <li key={id}>
            <span className={styles.mascotBadge}><img src={asset(`badge-${id}`)} alt="" /></span>
            <span>{label}</span><code>{id}</code>
          </li>)}</ul>
        </div>
      </div>

      <div className={styles.spareVoices}>
        <h2>Bổ sung biểu cảm hay tư thế</h2>
        <p>Thêm ảnh vào <code>tools/griffin-assets.json</code> (một dòng trong <code>moods</code> của tư thế), chạy lại <code>tools/griffin-assets.py</code> với thư mục bộ gốc, rồi <code>npm run build</code>. Bảng trên và component tự đọc bộ ảnh mới — xem <code>assets/mascot/griffin/README.md</code>.</p>
      </div>
    </>}
  </section>;
}
