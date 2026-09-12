"use client";

import type { ReactNode } from "react";
import { App, ConfigProvider, theme } from "antd";
import type { ThemeConfig } from "antd";
import viVN from "antd/locale/vi_VN";
import { STUDIO_COLORS } from "@/lib/design-tokens";

const { brand, lesson, neutral, status } = STUDIO_COLORS;

const studioTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: brand.primary,
    colorInfo: brand.primary,
    colorSuccess: status.success,
    colorWarning: status.warning,
    colorError: brand.secondary,
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
    boxShadow: "0 10px 24px -8px rgba(11, 42, 77, 0.12)",
    boxShadowSecondary: "0 18px 40px -12px rgba(11, 42, 77, 0.16)",
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
    Select: { activeBorderColor: brand.primary, hoverBorderColor: lesson.data },
    Table: { headerBg: neutral[50], headerColor: neutral[700], borderColor: neutral[200] },
    Tabs: { inkBarColor: brand.secondary, itemActiveColor: brand.primary, itemSelectedColor: brand.primary },
    Tag: { borderRadiusSM: 9999 },
  },
};

export function UiProvider({ children }: { children: ReactNode }) {
  return <ConfigProvider locale={viVN} theme={studioTheme}><App>{children}</App></ConfigProvider>;
}
