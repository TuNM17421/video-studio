import type { Metadata } from "next";
import Library from "@/components/library";

export const metadata: Metadata = { title: "Thư viện · Component" };

export default function Page() {
  return <Library section="components" />;
}
