"use client";

import { useEffect, useState, type ReactNode } from "react";
import { App, ConfigProvider, theme } from "antd";
import type { ThemeConfig } from "antd";
import viVN from "antd/locale/vi_VN";
import { useTheme } from "next-themes";
import { segmentedTheme, STUDIO_COLORS, STUDIO_COLORS_DARK } from "@/lib/design-tokens";

type Palette = typeof STUDIO_COLORS | typeof STUDIO_COLORS_DARK;

/**
 * Một công thức theme, hai bảng màu.
 *
 * Mọi giá trị đi từ bảng màu truyền vào, nên sáng và tối không bao giờ lệch nhau về cấu trúc — thêm một
 * token ở đây là cả hai chế độ cùng có. Hình dạng (bo góc, chiều cao, cỡ chữ) không phụ thuộc chế độ.
 */
function studioTheme(colors: Palette, dark: boolean): ThemeConfig {
  const { brand, lesson, neutral, status } = colors;
  return {
    algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: brand.primary,
      colorInfo: brand.primary,
      colorSuccess: status.success,
      colorWarning: status.warning,
      colorError: brand.secondary,
      // Chữ trên nền màu đặc (nút chính, số bước đang chọn). Ở chế độ tối màu thương hiệu đã được nâng sáng,
      // chữ trắng trên đó chỉ đạt ~2,6:1 — dùng mực tối của nền trang thay vào.
      ...(dark ? { colorTextLightSolid: neutral[0] } : {}),
      // Ant derives its pale fills from the seed, and our seeds are dark ink colors — left to derive
      // them it produced mud (a "done" tag came out rgb(151 161 154)). The design system already names
      // the right surfaces, so hand them over instead of letting Ant guess.
      colorSuccessBg: status.successSurface,
      colorSuccessText: status.success,
      colorWarningBg: status.warningSurface,
      colorWarningText: status.warning,
      colorErrorBg: status.dangerSurface,
      colorErrorText: brand.secondary,
      colorInfoBg: lesson.surface,
      colorInfoText: brand.primary,
      colorText: neutral[800],
      colorTextSecondary: neutral[700],
      colorTextTertiary: neutral[600],
      colorBgBase: neutral[0],
      colorBgLayout: neutral[100],
      colorBgContainer: neutral[0],
      colorBorder: neutral[300],
      colorBorderSecondary: neutral[200],
      borderRadius: 4,
      borderRadiusLG: 8,
      controlHeight: 44,
      controlHeightSM: 36,
      fontFamily: "var(--font-be-vietnam-pro), Arial, sans-serif",
      fontSize: 14,
      // Bóng navy tan biến trên nền tối; nền tối cũng nuốt bóng nhiều hơn nên phải đậm tay.
      boxShadow: dark ? "0 10px 24px -8px rgba(0, 0, 0, 0.5)" : "0 10px 24px -8px rgba(11, 42, 77, 0.12)",
      boxShadowSecondary: dark ? "0 18px 40px -12px rgba(0, 0, 0, 0.55)" : "0 18px 40px -12px rgba(11, 42, 77, 0.16)",
    },
    components: {
      Alert: { borderRadiusLG: 4, withDescriptionPadding: "14px 16px" },
      Button: { borderRadius: 4, fontWeight: 700, primaryShadow: "none" },
      Checkbox: { borderRadiusSM: 2 },
      Collapse: { borderRadiusLG: 4, headerBg: neutral[50], contentBg: neutral[0] },
      Descriptions: { labelBg: neutral[50] },
      Drawer: { colorBgElevated: neutral[0] },
      Form: { labelColor: neutral[700], labelFontSize: 13, verticalLabelPadding: "0 0 7px" },
      Input: { activeBorderColor: brand.primary, hoverBorderColor: lesson.data },
      Menu: {
        itemBg: "transparent",
        itemBorderRadius: 4,
        itemColor: neutral[600],
        itemHoverBg: neutral[100],
        itemHoverColor: neutral[800],
        itemSelectedBg: lesson.surface,
        itemSelectedColor: brand.primary,
      },
      Modal: { borderRadiusLG: 8 },
      Progress: { defaultColor: brand.primary, remainingColor: lesson.rail },
      Radio: { buttonCheckedBg: lesson.surface, buttonSolidCheckedBg: brand.primary },
      Segmented: segmentedTheme(colors),
      Select: { activeBorderColor: brand.primary, hoverBorderColor: lesson.data },
      Table: { headerBg: neutral[50], headerColor: neutral[700], borderColor: neutral[200] },
      Tabs: { inkBarColor: brand.secondary, itemActiveColor: brand.primary, itemSelectedColor: brand.primary },
      Tag: { borderRadiusSM: 9999 },
    },
  };
}

const LIGHT = studioTheme(STUDIO_COLORS, false);
const DARK = studioTheme(STUDIO_COLORS_DARK, true);

export function UiProvider({ children }: { children: ReactNode }) {
  // `resolvedTheme` mới là chế độ đang thật sự hiển thị — `theme` có thể là "system", không trả lời được
  // câu hỏi sáng hay tối.
  //
  // Vì sao phải chờ `mounted` thay vì dùng thẳng: máy chủ không đọc được localStorage nên luôn dựng bản
  // sáng. Nếu lần dựng ĐẦU ở trình duyệt đã là tối thì hai bên lệch nhau và React báo lỗi hydration —
  // đã thấy thật với SVG rỗng của antd (server `fill="#f5f5f5"`, client `fill="#292a2e"`). Cho lần đầu
  // khớp máy chủ rồi mới đổi ở effect: chỉ phần antd nháy sáng đúng một khung hình, còn nền và chữ của
  // trang đã tối sẵn từ trước khi vẽ nhờ thuộc tính data-theme.
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return <ConfigProvider locale={viVN} theme={dark ? DARK : LIGHT}><App>{children}</App></ConfigProvider>;
}
