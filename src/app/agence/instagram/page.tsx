"use client";

import { OsLayout } from "@/components/os-layout";
import { InstagramDashboard } from "@/components/cockpit/instagram/instagram-dashboard";

export default function InstagramAgentPage() {
  return (
    <OsLayout cpId="agence">
      <InstagramDashboard />
    </OsLayout>
  );
}
