import React from 'react';
import { BrowserFrame, Check, Person, StaticPath, SvgText, browserContentBox } from '../../../../components/index.js';
import { C, ROLE, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Lan, Scene } from './shared.jsx';

/*
 * Câu 15 — ai gặp khó khăn? The same LMS page sits between a new learner (Lan) and an older learner.
 * The new learner is lit (accent ring) and snags on the page; the older one gets a green check "đã quen".
 */
const N = 15;
const T = {
  page: 6,
  fresh: spokenAt(N, 'học viên mới') - 6,
  snag: spokenAt(N, 'vướng những chỗ') - 4,
  old: spokenAt(N, 'học viên cũ') - 6,
  used: spokenAt(N, 'không gặp') - 2,
};
const LMS = { x: 660, y: 360, w: 600, h: 430 };
const NEW = { x: 330, y: 560 };
const OLD = { x: 1590, y: 560 };

export default function S15() {
  const frame = useFrame();
  const b = browserContentBox(LMS, 28);
  const ring = appear(frame, T.fresh) * (0.55 + 0.45 * pulse(frame, T.fresh + 6));
  const rows = ['Tài liệu lớp', 'Nộp bài', 'Hộp thư hỗ trợ'];
  return (
    <Scene n={N} frame={frame}>
      <BrowserFrame {...LMS} title="Khóa học" url="lms.truong.edu.vn/khoa-hoc" opacity={appear(frame, T.page)}>
        <SvgText x={b.x} y={b.y + 26} size={17} weight={700} anchor="start" color={C.accent} letterSpacing={1.2}>
          BÀI TẬP LẦN ĐẦU
        </SvgText>
        {rows.map((r, i) => (
          <g key={r}>
            <rect x={b.x} y={b.y + 56 + i * 82} width={b.w} height={62} rx={12} fill={C.bgAlt} stroke={C.dotInactive} strokeWidth={2} />
            <SvgText x={b.x + 22} y={b.y + 96 + i * 82} size={22} weight={600} anchor="start">
              {r}
            </SvgText>
          </g>
        ))}
      </BrowserFrame>

      {/* new learner → page: snags (orange) */}
      <StaticPath points={[{ x: NEW.x + 90, y: NEW.y }, { x: LMS.x - 14, y: NEW.y }]} color={ROLE.orange} dashed opacity={appear(frame, T.snag)} />
      <g opacity={appear(frame, T.snag)}>
        <circle cx={(NEW.x + 90 + LMS.x) / 2} cy={NEW.y} r={24} fill={ROLE.orangeSoft} stroke={ROLE.orange} strokeWidth={3} />
        <SvgText x={(NEW.x + 90 + LMS.x) / 2} y={NEW.y + 10} size={28} weight={700} color={ROLE.orange}>
          !
        </SvgText>
        <SvgText x={(NEW.x + 90 + LMS.x) / 2} y={NEW.y - 40} size={20} weight={700} color={ROLE.orange}>
          vướng
        </SvgText>
      </g>
      {ring > 0.001 ? <circle cx={NEW.x} cy={NEW.y} r={72} fill="none" stroke={C.accent} strokeWidth={3 + 3 * ring} opacity={ring} /> : null}
      <Lan x={NEW.x} y={NEW.y} opacity={appear(frame, T.fresh)} />

      {/* older learner → page: used to it (green) */}
      <StaticPath points={[{ x: OLD.x - 90, y: OLD.y }, { x: LMS.x + LMS.w + 14, y: OLD.y }]} color={ROLE.green} opacity={appear(frame, T.used)} />
      <g opacity={appear(frame, T.used)}>
        <Check x={(OLD.x - 90 + LMS.x + LMS.w) / 2} y={OLD.y} size={40} color={ROLE.green} />
        <SvgText x={(OLD.x - 90 + LMS.x + LMS.w) / 2} y={OLD.y - 40} size={20} weight={700} color={ROLE.green}>
          đã quen
        </SvgText>
      </g>
      <Person x={OLD.x} y={OLD.y} r={62} name="Học viên cũ" role="đã nộp nhiều lần" color={C.textMuted} opacity={appear(frame, T.old)} />
    </Scene>
  );
}
