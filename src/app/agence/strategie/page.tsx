"use client";

import { OsLayout } from "@/components/os-layout";
import { StrategiePanel } from "@/components/cockpit/strategie-panel";

export default function StrategiePage() {
  return (
    <OsLayout cpId="agence">
      <StrategiePanel />
    </OsLayout>
  );
}
