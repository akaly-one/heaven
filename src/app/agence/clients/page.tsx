"use client";

import { OsLayout } from "@/components/os-layout";
import { ClientsPanel } from "@/components/cockpit/clients-panel";

export default function ClientsCRMPage() {
  return (
    <OsLayout cpId="agence">
      <ClientsPanel />
    </OsLayout>
  );
}
