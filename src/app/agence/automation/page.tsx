"use client";

import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";
import { AutomationContent } from "@/components/automation-content";

export default function AutomationPage() {
  const { currentModel } = useModel();
  const modelName = (currentModel || "model").toUpperCase();

  return (
    <OsLayout cpId="agence">
      <AutomationContent
        modelName={modelName}
        storageKey={`heaven_automation_${currentModel || "yumi"}`}
      />
    </OsLayout>
  );
}
