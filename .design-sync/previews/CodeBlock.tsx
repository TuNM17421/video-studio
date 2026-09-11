import React from 'react';
import { CodeBlock, C } from 'vinuni-lesson-video-ds';

// SVG code card in scene px — preview inside an <svg viewBox>.
const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

const ADD_PY = `# công cụ cục bộ: cộng hai số
def cong_hai_so(a: float, b: float) -> float:
    """Trả về tổng a + b."""
    return a + b

ket_qua = cong_hai_so(12, 30)
print(ket_qua)  # 42`;

const REQUEST_JSON = `{
  "model": "claude-demo",
  "system": "Bạn là trợ lý học vụ.",
  "messages": [
    { "role": "user", "content": "Lịch học thứ Hai?" }
  ]
}`;

const TOOL_JS = `const tools = [{
  name: "cong_hai_so",
  description: "Cộng hai số a và b",
  input_schema: { type: "object", required: ["a", "b"] },
}];`;

export const PythonTool = () => (
  <Stage w={960} h={380}>
    <CodeBlock x={30} y={30} w={900} code={ADD_PY} language="python" title="tools/cong_hai_so.py" illustrative />
  </Stage>
);

export const HighlightedFields = () => (
  <Stage w={960} h={380}>
    <CodeBlock x={30} y={30} w={900} code={REQUEST_JSON} language="json" title="request.json" highlight={[3, 5]} illustrative />
  </Stage>
);

export const AccentTone = () => (
  <Stage w={960} h={316}>
    <CodeBlock x={30} y={30} w={900} code={TOOL_JS} language="js" title="tools.js" highlight={[4]} tone="accent" dim={false} />
  </Stage>
);

export const TypingMidMotion = () => (
  <Stage w={960} h={380}>
    <CodeBlock x={30} y={30} w={900} code={ADD_PY} language="python" title="tools/cong_hai_so.py" frame={110} start={0} cps={40} illustrative />
  </Stage>
);
