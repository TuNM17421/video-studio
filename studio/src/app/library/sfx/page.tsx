import type { Metadata } from "next";
import Library from "@/components/library";

export const metadata: Metadata = { title: "Thư viện · Tiếng động" };

export default function Page() {
  return <Library section="sfx" />;
}
