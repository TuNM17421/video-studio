import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { UiProvider } from "@/components/ui-provider";
import "./vinuni-tokens.css";
import "./globals.css";
import "./studio.css";

// Variable axis: the stylesheet leans on fine-grained weights that would collapse
// onto a static 400/500/600/700 set.
const montserrat = Montserrat({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: { default: "Video Studio", template: "%s · Video Studio" },
  description: "Dựng video bài giảng AI in Action 20K bằng design system và Claude Code.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" className={montserrat.variable}><body><AntdRegistry><UiProvider>{children}</UiProvider></AntdRegistry></body></html>;
}
