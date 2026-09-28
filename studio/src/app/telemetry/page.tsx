import type { Metadata } from "next";
import TelemetryTab from "@/components/telemetry-tab";

export const metadata: Metadata = { title: "Số liệu" };

export default function Page() {
  return <TelemetryTab />;
}
