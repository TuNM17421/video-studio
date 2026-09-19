"use client";

import { useEffect, useState } from "react";
import { DesktopOutlined, MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Dropdown } from "antd";
import { useTheme } from "next-themes";

const OPTIONS = [
  { value: "light", icon: <SunOutlined />, label: "Sáng" },
  { value: "dark", icon: <MoonOutlined />, label: "Tối" },
  { value: "system", icon: <DesktopOutlined />, label: "Theo máy" },
] as const;

/**
 * Ba lựa chọn chứ không phải công tắc hai nấc: "theo máy" là mặc định, và người đã chọn tay một lần thì
 * phải có đường quay lại. Gói trong một menu thả xuống thay vì bày cả ba ra hàng ngang — thanh bên thu về
 * dải biểu tượng chỉ rộng 72px, một hàng ba nút sẽ không còn chỗ, còn một nút thì vẫn vừa. Mang dáng một
 * `sidebar-item` để đứng cùng hàng với mục ElevenLabs ở đáy thanh bên.
 *
 * Chưa gắn xong (`mounted`) thì chưa vẽ nội dung: lúc đó chế độ thật nằm trong localStorage mà máy chủ
 * không đọc được, vẽ bừa sẽ ra nút sáng nhấp nháy thành nút tối ngay sau đó.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const current = OPTIONS.find((o) => o.value === (theme ?? "system")) ?? OPTIONS[2];

  // Giữ đúng chiều cao của một mục để đáy thanh bên không nhảy khi gắn xong.
  if (!mounted) return <div className="sidebar-item vs-theme-toggle" aria-hidden="true" />;

  return <Dropdown
    trigger={["click"]}
    placement="topLeft"
    menu={{
      selectable: true,
      selectedKeys: [current.value],
      items: OPTIONS.map(({ value, icon, label }) => ({ key: value, icon, label })),
      onClick: ({ key }) => setTheme(key),
    }}
  >
    <button type="button" className="sidebar-item vs-theme-toggle" aria-label={`Giao diện · ${current.label}`} title={`Giao diện · ${current.label}`}>
      {current.icon}
      <span className="vs-sidebar-label">Giao diện</span>
      <span className="vs-sidebar-label vs-theme-value">{current.label}</span>
    </button>
  </Dropdown>;
}
