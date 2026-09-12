"use client";

import type { ReactNode } from "react";
import { App, ConfigProvider, theme } from "antd";
import viVN from "antd/locale/vi_VN";

const studioTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: "#134d8b",
    colorInfo: "#134d8b",
    colorSuccess: "#0e623a",
    colorWarning: "#874e00",
    colorError: "#c72127",
    colorText: "#2e2e2e",
    colorTextSecondary: "#666666",
    colorTextTertiary: "#848484",
    colorBgBase: "#ffffff",
    colorBgLayout: "#f4f4f4",
    colorBgContainer: "#ffffff",
    colorBorder: "#d9d9d9",
    colorBorderSecondary: "#eeeeef",
    borderRadius: 4,
    borderRadiusLG: 8,
    controlHeight: 44,
    controlHeightSM: 36,
    fontFamily: "var(--font-montserrat), Montserrat, Arial, sans-serif",
    fontSize: 14,
    boxShadow: "0 10px 24px -8px rgba(11, 42, 77, 0.12)",
    boxShadowSecondary: "0 18px 40px -12px rgba(11, 42, 77, 0.16)",
  },
  components: {
    Alert: { borderRadiusLG: 4, withDescriptionPadding: "14px 16px" },
    Button: { borderRadius: 4, fontWeight: 700, primaryShadow: "none" },
    Checkbox: { borderRadiusSM: 2 },
    Collapse: { borderRadiusLG: 4, headerBg: "#f8f9fa", contentBg: "#ffffff" },
    Descriptions: { labelBg: "#f8f9fa" },
    Drawer: { colorBgElevated: "#ffffff" },
    Form: { labelColor: "#4a4a4a", labelFontSize: 13, verticalLabelPadding: "0 0 7px" },
    Input: { activeBorderColor: "#134d8b", hoverBorderColor: "#387aad" },
    Menu: {
      itemBg: "transparent",
      itemBorderRadius: 4,
      itemColor: "#666666",
      itemHoverBg: "#f4f4f4",
      itemHoverColor: "#2e2e2e",
      itemSelectedBg: "#f2f7fc",
      itemSelectedColor: "#103e70",
    },
    Modal: { borderRadiusLG: 8 },
    Progress: { defaultColor: "#134d8b", remainingColor: "#e0edf8" },
    Radio: { buttonCheckedBg: "#f2f7fc", buttonSolidCheckedBg: "#134d8b" },
    Select: { activeBorderColor: "#134d8b", hoverBorderColor: "#387aad" },
    Table: { headerBg: "#f8f9fa", headerColor: "#4a4a4a", borderColor: "#eeeeef" },
    Tabs: { inkBarColor: "#c72127", itemActiveColor: "#103e70", itemSelectedColor: "#103e70" },
    Tag: { borderRadiusSM: 9999 },
  },
} as const;

export function UiProvider({ children }: { children: ReactNode }) {
  return <ConfigProvider locale={viVN} theme={studioTheme}><App>{children}</App></ConfigProvider>;
}
