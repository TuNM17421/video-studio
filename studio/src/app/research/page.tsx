import { Suspense } from "react";
import type { Metadata } from "next";
import ResearchPage from "@/components/research/research-page";

export const metadata: Metadata = { title: "Đóng gói kịch bản" };

export default function Page() {
  return <Suspense fallback={null}><ResearchPage /></Suspense>;
}
