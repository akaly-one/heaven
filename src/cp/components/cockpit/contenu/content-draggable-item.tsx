"use client";

// ════════════════════════════════════════════════════════════════
//  ContentDraggableItem — Heaven CP contenu drag source
//  HTML5 native drag-and-drop (no @dnd-kit). Used by PackComposer
//  in all 3 views (Dossiers, Colonnes, Liste).
//
//  Only "upload" and "post" sources are actually draggable;
//  "instagram" and "wall" are read-only (preventDefault in onDragStart).
// ════════════════════════════════════════════════════════════════

import { useCallback } from "react";
import type { ReactNode, CSSProperties, DragEvent } from "react";

export type DraggableSource = "upload" | "post" | "instagram" | "wall";

export interface ContentDraggablePayload {
  id: string;
  source: DraggableSource;
}

interface ContentDraggableItemProps {
  id: string;
  source: DraggableSource;
  /** Called when drag starts with valid source (upload|post). */
  onPick: (payload: ContentDraggablePayload) => void;
  /** Called when drag ends (success or cancel). */
  onRelease: () => void;
  /** Render as a <tr> instead of <div> for list/table views. */
  as?: "div" | "tr";
  /** Styling */
  className?: string;
  style?: CSSProperties;
  /** Dragging state — parent passes `isDragging` to dim item. */
  isDragging?: boolean;
  /** Children rendered inside the drag source. */
  children: ReactNode;
}

export function ContentDraggableItem({
  id,
  source,
  onPick,
  onRelease,
  as = "div",
  className = "",
  style,
  isDragging = false,
  children,
}: ContentDraggableItemProps) {
  const handleDragStart = useCallback(
    (e: DragEvent<HTMLElement>) => {
      // Read-only sources cannot be reorganized across tiers
      if (source !== "upload" && source !== "post") {
        e.preventDefault();
        return;
      }
      const payload: ContentDraggablePayload = { id, source };
      e.dataTransfer.setData("application/json", JSON.stringify(payload));
      e.dataTransfer.effectAllowed = "move";
      // Delay state update so the native drag image renders first
      requestAnimationFrame(() => onPick(payload));
    },
    [id, source, onPick]
  );

  const handleDragEnd = useCallback(() => {
    onRelease();
  }, [onRelease]);

  const mergedStyle: CSSProperties = {
    opacity: isDragging ? 0.3 : 1,
    transition: "opacity 0.15s, transform 0.15s",
    ...style,
  };

  if (as === "tr") {
    return (
      <tr
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={className}
        style={mergedStyle}
      >
        {children}
      </tr>
    );
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={className}
      style={mergedStyle}
    >
      {children}
    </div>
  );
}
