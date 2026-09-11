import React from 'react';
import { appear, interpolate } from '../../lib/motion.js';

/**
 * Centered check-your-understanding questions (HTML overlay in the content zone): 1–3 questions
 * at 44 px bold, revealed 20 frames apart with a 14 px rise, then a muted 24 px hint.
 * Every line is always laid out (opacity reveals only), so nothing reflows.
 * Port of the "Bạn kể lại vòng sinh như thế nào?" scene (Day01 V03).
 */
export function QuestionCard({ questions, hint, frame, start = 0, top = 360, gap = 130 }) {
  const hintAt = start + questions.length * 20 + 24;
  return (
    <div className="vk-question" style={{ top }}>
      {questions.map((q, i) => {
        const opacity = appear(frame, start + i * 20, 24);
        const rise = interpolate(opacity, [0, 1], [14, 0]);
        return (
          <div key={q} className="vk-question__q" style={{ opacity, transform: `translateY(${rise}px)`, height: gap }}>
            {q}
          </div>
        );
      })}
      {hint ? (
        <div className="vk-question__hint" style={{ opacity: appear(frame, hintAt, 24) }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}
