import type { Metadata } from "next";
import Guide from "@/components/guide";

export const metadata: Metadata = { title: "Hướng dẫn" };

export default function Page() {
  return <Guide />;
}
