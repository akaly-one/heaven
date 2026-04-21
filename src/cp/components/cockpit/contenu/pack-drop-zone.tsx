"use client";

// ════════════════════════════════════════════════════════════════
//  PackDropZone — Heaven CP contenu drop target
//  Wraps any element so it can receive a ContentDraggableItem.
//
//  Behavior: on drop, decodes the JSON payload and delegates to
//  the caller via onDropItem(tier, payload). The caller is
//  responsible for actually moving the item (API call).
// ════════════════════════════════════════════════════════════════

import { useCallback } from "react";
import type { ReactNode, CSSProperties, DragEvent } from "react";
import type { ContentDraggablePayload } from "./content-draggable-item";

interface PackDropZoneProps {
  /** Tier id this zone accepts (e.g. "p0", "p1", "custom"). */
  tier: string;
  /** Called when a valid drag-source is dropped. */
  onDropItem: (tier: string, payload: ContentDraggablePayload) => void;
  /** Called when drag enters this zone (for highlight state). */
  onDragEnterZone?: (tier: string) => void;
  /** Called when drag leaves this zone. */
  onDragLeaveZone?: () => void;
  /** Optional click handler (passthrough — e.g. select folder). */
  onClick?: () => void;
  /** Render tag (default div, sometimes you want button-like). */
  as?: "div";
  /** Styling */
  className?: string;
  style?: CSSProperties;
  /** Children rendered inside the drop zone. */
  children: ReactNode;
}

export function PackDropZone({
  tier,
  onDropItem,
  onDragEnterZone,
  onDragLeaveZone,
  onClick,
  className = "",
  style,
  children,
}: PackDropZoneProps) {
  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (onDragEnterZone) onDragEnterZone(tier);
    },
    [tier, onDragEnterZone]
  );

  const handleDragLeave = useCallback(() => {
    if (onDragLeaveZone) onDragLeaveZone();
  }, [onDragLeaveZone]);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (onDragLeaveZone) onDragLeaveZone();
      try {
        const raw = e.dataTransfer.getData("application/json");
        if (!raw) return;
        const payload = JSON.parse(raw) as ContentDraggablePayload;
        if (!payload?.id || !payload?.source) return;
        onDropItem(tier, payload);
      } catch {
        /* malformed payload — silently ignore */
      }
    },
    [tier, onDropItem, onDragLeaveZone]
  );

  return (
    <div
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={className}
      style={style}
    >
      {children}
    </div>
  );
}
