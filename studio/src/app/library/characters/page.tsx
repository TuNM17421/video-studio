import type { Metadata } from "next";
import Library from "@/components/library";

export const metadata: Metadata = { title: "Thư viện · Nhân vật" };

export default function Page() {
  return <Library section="characters" />;
}
