import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { STUDIO_COLOR_GROUPS, STUDIO_LAYOUT, STUDIO_MOTION, STUDIO_TYPOGRAPHY, STUDIO_WORKFLOW_EMPHASIS } from "@/lib/design-tokens";
import { DesignSystemPlayground } from "./playground";
import styles from "./design-system.module.css";

export const metadata: Metadata = {
  title: "Design system",
  description: "Token, component và motion contract cho Video Studio.",
};

const SPACING = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64];
const RADII = [
  { name: "Control", value: 4 },
  { name: "Panel", value: 8 },
  { name: "Feature", value: 12 },
];
const GATES = ["Kế hoạch", "Lời & cue", "Giọng đọc", "Dựng cảnh", "Render"];

export default function DesignSystemPage() {
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <div className={styles.topbarInner}>
        <div className={styles.wordmark}>
          <span className={styles.mark} aria-hidden="true"><i /><i /><i /><i /></span>
          <span>Video Studio</span>
          <span className={styles.path}>/ design-system</span>
        </div>
        <Link href="/" className={styles.backLink}>← Về bàn dựng</Link>
      </div>
    </header>

    <div className={styles.content}>
      <section className={styles.hero} aria-labelledby="design-system-title">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}><span /> Studio foundations · v1.3.6</p>
          <h1 id="design-system-title">Bàn dựng học liệu,<br /><em>rõ đến từng cue.</em></h1>
          <p className={styles.lede}>Một ngôn ngữ giao diện cho người dựng video bài giảng: màu VinUni làm mốc, typography Việt dễ đọc và trạng thái vận hành chính xác như timecode.</p>
          <dl className={styles.heroFacts}>
            <div><dt>UI engine</dt><dd>Ant Design 6</dd></div>
            <div><dt>Grid</dt><dd>4 px</dd></div>
            <div><dt>Theme</dt><dd>Light</dd></div>
          </dl>
        </div>
        <div className={styles.heroSignal}>
          <div className={styles.signalHeader}><span>Luồng sản xuất</span><strong>05 cổng</strong></div>
          <ol className={styles.heroRail}>
            {GATES.map((gate, index) => <li key={gate} className={index < 3 ? styles.complete : index === 3 ? styles.current : ""}>
              <span>{String(index + 1).padStart(2, "0")}</span><strong>{gate}</strong>
            </li>)}
          </ol>
          <p>Một chuyển động có chủ đích: tiến độ chạy dọc rail, không rải hiệu ứng lên mọi card.</p>
        </div>
      </section>

      <nav className={styles.sectionNav} aria-label="Mục design system">
        <a href="#color">Màu</a>
        <a href="#type">Typography</a>
        <a href="#geometry">Hình học</a>
        <a href="#components">Component</a>
        <a href="#motion">Motion</a>
        <a href="#contract">Contract</a>
      </nav>

      <section className={styles.section} id="color" aria-labelledby="color-title">
        <div className={styles.sectionHeading}>
          <p>01 · Foundations</p>
          <div><h2 id="color-title">Màu có nguồn gốc rõ ràng</h2><span>Brand anchors lấy từ website VinUni; lesson colors giữ vai trò riêng trong sản phẩm.</span></div>
        </div>
        <div className={styles.colorGroups}>
          {STUDIO_COLOR_GROUPS.map((group) => <article className={styles.colorGroup} key={group.title}>
            <header><h3>{group.title}</h3><p>{group.note}</p></header>
            <ul className={styles.swatches}>
              {group.colors.map((color) => <li key={color.token} className={color.dark ? styles.darkSwatch : ""} style={{ "--swatch": color.value } as CSSProperties}>
                <span className={styles.swatchName}>{color.name}</span>
                <span className={styles.swatchToken}>{color.token}</span>
                <code>{color.value.toUpperCase()}</code>
              </li>)}
            </ul>
          </article>)}
        </div>
        <aside className={styles.a11yNote}><strong>Quy tắc accessibility</strong><span>Không dùng neutral `#848484` cho chữ nhỏ trên nền trắng. Nội dung phụ bắt đầu từ `#666666` để giữ độ tương phản đọc được.</span></aside>
      </section>

      <section className={styles.section} id="type" aria-labelledby="type-title">
        <div className={styles.sectionHeading}>
          <p>02 · Typography</p>
          <div><h2 id="type-title">Ba giọng chữ, ba nhiệm vụ</h2><span>Mỗi font đảm nhiệm một loại thông tin mà người dựng video nhận ra ngay.</span></div>
        </div>
        <div className={styles.typeGrid}>
          <div className={styles.typeSpecimen}>
            <span className={styles.typeLabel}>Display · Montserrat 700</span>
            <p className={styles.displaySample}>Dựng cảnh theo lời thật</p>
            <span className={styles.redRule} />
          </div>
          <div className={styles.typeSpecimen}>
            <span className={styles.typeLabel}>Product UI · Be Vietnam Pro 400 / 600</span>
            <p className={styles.bodySample}>Kiểm tra từng cue, duyệt ảnh QA và chỉ render khi mọi cổng đã hoàn tất.</p>
          </div>
          <div className={`${styles.typeSpecimen} ${styles.monoSpecimen}`}>
            <span className={styles.typeLabel}>Technical · IBM Plex Mono 500</span>
            <p>d02-r1-v03 · 00:42.180 · frame 1265</p>
          </div>
        </div>
        <ol className={styles.typeRoles}>
          {STUDIO_TYPOGRAPHY.map((item) => <li key={item.role}><span>{item.role}</span><strong>{item.family}</strong><p>{item.usage}</p><code>{item.weights}</code></li>)}
        </ol>
      </section>

      <section className={styles.section} id="geometry" aria-labelledby="geometry-title">
        <div className={styles.sectionHeading}>
          <p>03 · Geometry</p>
          <div><h2 id="geometry-title">Nhịp 4 px, bề mặt phẳng</h2><span>Độ nổi chỉ dành cho panel cần tách khỏi luồng làm việc, không dùng để trang trí.</span></div>
        </div>
        <div className={styles.geometryGrid}>
          <article className={styles.measurePanel}><h3>Spacing scale</h3><ul className={styles.spaceScale}>{SPACING.map((value) => <li key={value}><code>{value}</code><span style={{ width: value }} /></li>)}</ul></article>
          <article className={styles.measurePanel}><h3>Radius</h3><div className={styles.radiusScale}>{RADII.map((radius) => <div key={radius.name}><span style={{ borderRadius: radius.value }} /><strong>{radius.name}</strong><code>{radius.value} px</code></div>)}</div></article>
          <article className={styles.measurePanel}><h3>Elevation</h3><div className={styles.elevationScale}><span>Flat</span><span>Raised</span><span>Focus</span></div></article>
          <article className={`${styles.measurePanel} ${styles.layoutContract}`}>
            <h3>Studio layout contract</h3>
            <div className={styles.layoutContractBody}>
              <dl className={styles.layoutTokens}>{STUDIO_LAYOUT.map((item) => <div key={item.token}><dt><code>{item.token}</code><strong>{item.value}</strong></dt><dd>{item.usage}</dd></div>)}</dl>
              <div className={styles.emphasisContract}>
                <span>Workflow hierarchy</span>
                <ol>{STUDIO_WORKFLOW_EMPHASIS.map((item) => <li key={item.state}><i style={{ opacity: Number.parseInt(item.value, 10) / 100 }} /><strong>{item.state}</strong><code>{item.value}</code><p>{item.usage}</p></li>)}</ol>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.section} id="components" aria-labelledby="components-title">
        <div className={styles.sectionHeading}>
          <p>04 · UI engine</p>
          <div><h2 id="components-title">Ant Design, nói giọng Studio</h2><span>Component hành xử theo chuẩn thư viện nhưng được viết lại bằng ngôn ngữ của bàn dựng.</span></div>
        </div>
        <DesignSystemPlayground />
      </section>

      <section className={styles.section} id="motion" aria-labelledby="motion-title">
        <div className={styles.sectionHeading}>
          <p>05 · Motion</p>
          <div><h2 id="motion-title">Chuyển động báo tiến trình</h2><span>CSS trước, thêm thư viện chỉ khi animation layout thực sự cần.</span></div>
        </div>
        <div className={styles.motionList}>{STUDIO_MOTION.map((item) => <div key={item.token}><code>{item.token}</code><strong>{item.value}</strong><span>{item.usage}</span></div>)}</div>
      </section>

      <section className={`${styles.section} ${styles.contract}`} id="contract" aria-labelledby="contract-title">
        <div className={styles.sectionHeading}>
          <p>06 · Contract</p>
          <div><h2 id="contract-title">Điều kiện để một màn hình được duyệt</h2><span>Không gọi là hoàn thiện nếu còn một điều kiện chặn.</span></div>
        </div>
        <ul>
          <li><strong>Đúng việc:</strong> hành động chính và cổng duyệt hiện tại nhìn thấy trong lần quét đầu tiên.</li>
          <li><strong>Đủ trạng thái:</strong> loading, empty, error, review, done, disabled và permission có cách xử lý thật.</li>
          <li><strong>Đúng hệ:</strong> không thêm hex, font hay component library ngoài token contract mà không ghi lý do.</li>
          <li><strong>Đúng component boundary:</strong> CSS cho input native không được tràn vào input nội bộ của Ant Select, Cascader hoặc TreeSelect.</li>
          <li><strong>Đúng form spacing:</strong> textarea có bộ đếm phải dành riêng một hàng 24 px bên dưới; action kế tiếp không được chạm hoặc đè lên counter.</li>
          <li><strong>Đúng style picker:</strong> mỗi lựa chọn phải cho thấy ngôn ngữ hình ảnh bằng mini-scene gồm ba component tiêu biểu, hiển thị trọn hình trong khung cố định và có padding 14 px; palette chỉ là metadata phụ, không dùng một dải màu làm preview chính.</li>
          <li><strong>Đúng navigation:</strong> sidebar desktop thu gọn thành rail 72 px; mỗi icon dùng điểm chạm 44 px, active state bao trọn điểm chạm và nhãn chuyển sang tooltip. Control thu gọn nằm trong header sidebar; khi rail đóng, logo nhường chỗ cho control mở rộng lúc hover hoặc focus. Trạng thái rail phải giữ nguyên khi đổi route, không nháy về sidebar mở. Mobile luôn hiển thị đầy đủ nhãn.</li>
          <li><strong>Đúng đường đi:</strong> cuối mỗi cổng có Back và Next; Next vẫn hiện khi bị khóa và nói rõ điều kiện để tiếp tục.</li>
          <li><strong>Đúng hierarchy:</strong> production flow dùng active 100%, completed 70%, future 35%; chữ trạng thái vẫn phải giữ contrast đọc được.</li>
          <li><strong>Đủ viewport:</strong> desktop 1440, laptop 1024 và mobile 390 không tràn hoặc mất thao tác.</li>
          <li><strong>Đủ tiếp cận:</strong> focus rõ, contrast đạt, touch target đủ lớn và reduced-motion hoạt động.</li>
        </ul>
      </section>
    </div>
  </main>;
}
