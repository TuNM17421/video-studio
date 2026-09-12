import type { Metadata } from "next";
import { Be_Vietnam_Pro, IBM_Plex_Mono, Montserrat } from "next/font/google";
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

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: { default: "Video Studio", template: "%s · Video Studio" },
  description: "Dựng video bài giảng AI in Action 20K bằng design system với Claude Code hoặc Codex.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const fonts = `${montserrat.variable} ${beVietnamPro.variable} ${ibmPlexMono.variable}`;
  return <html lang="vi" className={fonts}><body><AntdRegistry><UiProvider>{children}</UiProvider></AntdRegistry></body></html>;
}
