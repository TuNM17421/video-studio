/**
 * Hình minh hoạ cho trang Hướng dẫn, vẽ thẳng bằng SVG.
 *
 * Không dùng file ảnh: repo đã chặn nhị phân nặng, và hình vẽ bằng mã thì sắc nét ở mọi cỡ màn hình,
 * đổi màu theo token được, sửa được bằng diff. Màu lấy từ STUDIO_COLORS qua biến CSS `--vu-*`, không
 * viết mã hex mới — đúng luật của design system Studio.
 */

const INK = "var(--vu-blue-900)";
const LINE = "var(--vu-neutral-300)";
const BRAND = "var(--vu-blue-700)";
const RED = "var(--vu-red-700)";
const PAPER = "var(--vu-neutral-0)";
const SOFT = "var(--vu-blue-50)";

/** Khung chung: mọi hình cùng khổ 200×120 nên hàng thẻ không bị so le. */
function Art({ children, label }: { children: React.ReactNode; label: string }) {
  return <svg className="vs-guide-art" viewBox="0 0 200 120" role="img" aria-label={label}>{children}</svg>;
}

/** Kế hoạch: một tờ kịch bản đi vào, chọn style, ra một hồ sơ video. */
export function ArtPlan() {
  return <Art label="Kịch bản và style ghép thành hồ sơ video">
    <rect x="16" y="24" width="46" height="62" rx="4" fill={PAPER} stroke={LINE} strokeWidth="1.5" />
    {[34, 42, 50, 58, 66, 74].map((y) => <rect key={y} x="24" y={y} width={y === 74 ? 18 : 30} height="3" rx="1.5" fill={LINE} />)}
    <path d="M70 55h18" stroke={LINE} strokeWidth="1.5" strokeDasharray="3 3" />
    <rect x="94" y="30" width="42" height="26" rx="4" fill={SOFT} stroke={BRAND} strokeWidth="1.5" />
    {[100, 108, 116, 124].map((x, i) => <rect key={x} x={x} y="36" width="6" height="14" rx="1" fill={[INK, BRAND, RED, LINE][i]} />)}
    <rect x="94" y="64" width="42" height="22" rx="4" fill={PAPER} stroke={LINE} strokeWidth="1.5" />
    <rect x="100" y="72" width="20" height="3" rx="1.5" fill={LINE} />
    <path d="M144 58h16" stroke={LINE} strokeWidth="1.5" strokeDasharray="3 3" />
    <rect x="166" y="40" width="20" height="36" rx="4" fill={BRAND} />
    <path d="M172 58h8M176 54v8" stroke={PAPER} strokeWidth="2" strokeLinecap="round" />
  </Art>;
}

/** Lời & cue: kịch bản cắt thành từng câu đánh số. */
export function ArtCues() {
  return <Art label="Kịch bản được cắt thành từng câu đánh số">
    <rect x="14" y="26" width="54" height="68" rx="4" fill={PAPER} stroke={LINE} strokeWidth="1.5" />
    {[36, 46, 56, 66, 76].map((y) => <rect key={y} x="22" y={y} width="38" height="3" rx="1.5" fill={LINE} />)}
    <path d="M76 60h16" stroke={LINE} strokeWidth="1.5" strokeDasharray="3 3" />
    {[30, 58, 86].map((y, i) => <g key={y}>
      <rect x="100" y={y} width="86" height="20" rx="4" fill={i === 0 ? SOFT : PAPER} stroke={i === 0 ? BRAND : LINE} strokeWidth="1.5" />
      <circle cx="112" cy={y + 10} r="6" fill={i === 0 ? BRAND : LINE} />
      <text x="112" y={y + 13} textAnchor="middle" fontSize="8" fill={PAPER} fontFamily="monospace">{i + 1}</text>
      <rect x="124" y={y + 8} width={[50, 42, 34][i]} height="3" rx="1.5" fill={LINE} />
    </g>)}
  </Art>;
}

/** Giọng đọc: ba nguồn cùng đổ về một dải sóng âm. */
export function ArtVoice() {
  const bars = [10, 20, 32, 24, 38, 28, 16, 30, 22, 12];
  return <Art label="Ba nguồn giọng cùng tạo ra một bản thu">
    {[["API", 22], ["Tự thu", 52], ["Model", 82]].map(([text, y], i) => <g key={String(y)}>
      <rect x="10" y={Number(y)} width="46" height="20" rx="4" fill={i === 0 ? SOFT : PAPER} stroke={i === 0 ? BRAND : LINE} strokeWidth="1.5" />
      <text x="33" y={Number(y) + 14} textAnchor="middle" fontSize="9" fill={INK}>{text}</text>
      <path d={`M60 ${Number(y) + 10}C74 ${Number(y) + 10} 74 60 88 60`} stroke={LINE} strokeWidth="1.5" fill="none" />
    </g>)}
    {bars.map((h, i) => <rect key={i} x={96 + i * 10} y={60 - h / 2} width="5" height={h} rx="2.5" fill={i % 3 === 0 ? BRAND : LINE} />)}
  </Art>;
}

/** Dựng cảnh: sóng âm bên dưới, khung hình khớp đúng mốc thời gian bên trên. */
export function ArtScenes() {
  return <Art label="Cảnh được dựng khớp đúng thời điểm của giọng">
    {[16, 74, 132].map((x, i) => <g key={x}>
      <rect x={x} y="20" width="52" height="34" rx="4" fill={i === 1 ? SOFT : PAPER} stroke={i === 1 ? BRAND : LINE} strokeWidth="1.5" />
      <rect x={x + 8} y="28" width="24" height="3" rx="1.5" fill={LINE} />
      <rect x={x + 8} y="36" width="36" height="10" rx="2" fill={i === 1 ? BRAND : LINE} opacity={i === 1 ? 1 : 0.4} />
      <path d={`M${x + 26} 54v14`} stroke={LINE} strokeWidth="1.5" strokeDasharray="3 3" />
    </g>)}
    <rect x="12" y="72" width="176" height="26" rx="4" fill={PAPER} stroke={LINE} strokeWidth="1.5" />
    {Array.from({ length: 22 }, (_, i) => {
      const h = [8, 14, 20, 12, 6][i % 5];
      return <rect key={i} x={20 + i * 7.6} y={85 - h / 2} width="3" height={h} rx="1.5" fill={[0, 8, 16].includes(i) ? BRAND : LINE} />;
    })}
  </Art>;
}

/** Render: khung hình + âm thanh + nhạc ghép thành một tệp MP4. */
export function ArtRender() {
  return <Art label="Khung hình, giọng và nhạc ghép thành MP4">
    {[["Hình", 18, LINE], ["Giọng", 44, BRAND], ["Nhạc", 70, LINE]].map(([text, y, color]) => <g key={String(y)}>
      <rect x="12" y={Number(y)} width="50" height="20" rx="4" fill={PAPER} stroke={String(color)} strokeWidth="1.5" />
      <text x="37" y={Number(y) + 14} textAnchor="middle" fontSize="9" fill={INK}>{text}</text>
      <path d={`M66 ${Number(y) + 10}C82 ${Number(y) + 10} 82 54 98 54`} stroke={LINE} strokeWidth="1.5" fill="none" />
    </g>)}
    <rect x="106" y="30" width="80" height="48" rx="6" fill={INK} />
    <path d="M138 46l16 8-16 8z" fill={PAPER} />
    <rect x="106" y="84" width="80" height="4" rx="2" fill={LINE} />
    <rect x="106" y="84" width="48" height="4" rx="2" fill={RED} />
  </Art>;
}

/** Ai làm gì: ba vai — bạn, Studio, agent. */
export function ArtRoles() {
  const box = (x: number, title: string, accent: string) => <g key={title}>
    <rect x={x} y="28" width="54" height="64" rx="6" fill={PAPER} stroke={accent} strokeWidth="1.5" />
    <circle cx={x + 27} cy="48" r="9" fill={accent} opacity="0.18" />
    <circle cx={x + 27} cy="45" r="4" fill={accent} />
    <path d={`M${x + 19} 56c2-4 14-4 16 0`} stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round" />
    <text x={x + 27} y="76" textAnchor="middle" fontSize="9" fill={INK}>{title}</text>
  </g>;
  return <Art label="Ba vai: bạn, Studio và agent">
    {box(12, "Bạn", BRAND)}
    {box(73, "Studio", INK)}
    {box(134, "Agent", RED)}
    <path d="M66 60h7M127 60h7" stroke={LINE} strokeWidth="1.5" strokeDasharray="3 3" />
  </Art>;
}
