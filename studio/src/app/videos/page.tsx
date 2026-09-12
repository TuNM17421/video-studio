import type { Metadata } from "next";
import Videos from "@/components/videos";

export const metadata: Metadata = { title: "Các video" };

export default function Page() {
  return <Videos />;
}
