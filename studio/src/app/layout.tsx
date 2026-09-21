import type { Metadata } from "next";
import { Be_Vietnam_Pro, IBM_Plex_Mono, Montserrat } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ThemeProvider } from "next-themes";
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
  // `data-theme` nằm trên <html> chứ không phải <body>: đó là nơi :root khai toàn bộ biến màu, là thứ duy
  // nhất phủ được cả vùng cuộn quá đà lẫn các portal antd dựng ở cuối <body>. next-themes chèn một script
  // chạy trước khi trang vẽ để đặt sẵn thuộc tính đó — không có nó thì mỗi lần tải lại sẽ loé trắng một
  // nhịp. Chính script đó cũng khiến HTML máy chủ dựng khác HTML trình duyệt, nên cần suppressHydrationWarning.
  return <html lang="vi" className={fonts} suppressHydrationWarning>
    <body>
      <AntdRegistry>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
          <UiProvider>{children}</UiProvider>
        </ThemeProvider>
      </AntdRegistry>
    </body>
  </html>;
}
