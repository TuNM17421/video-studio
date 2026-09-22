import type { NextConfig } from "next";
import path from "node:path";

// Local-only tool: the studio frames its own /ds pages (scene previews), so SAMEORIGIN, not DENY.
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  // The Studio intentionally reads the parent video repository and linked design system.
  turbopack: { root: path.resolve(process.cwd(), "..") },
  // The research page used to live at a Vietnamese slug; keep old links and bookmarks working.
  async redirects() {
    return [{ source: "/dong-goi-kich-ban", destination: "/research", permanent: false }];
  },
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
    ] }];
  },
};
export default config;
