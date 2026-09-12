import type { Metadata } from "next";
import Studio from "@/components/studio";

export const metadata: Metadata = { title: "Video mới" };

export default function Page() {
  return <Studio />;
}
