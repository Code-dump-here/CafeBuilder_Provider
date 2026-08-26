"use client";

import * as React from "react";

/**
 * Drag-to-reorder for a single vertical list, built on the native HTML5 drag
 * events so it costs no dependency.
 *
 * The hook is headless: it owns only the drag bookkeeping and hands back props
 * to spread. Callers decide what a row looks like, which rows may be dragged,
 * and what to do with the new order.
 *
 * Dragging is a mouse gesture, so it can never be the only way to reorder —
 * pair it with [move] behind ordinary buttons or menu items for keyboard and
 * touch users.
 */

/** Which side of a row the dragged item would land on. */
export type DropEdge = "top" | "bottom";

export interface DragReorderItemProps {
  /** Spread on the row itself — it is the drop target. */
  containerProps: React.HTMLAttributes<HTMLElement>;
  /** Spread on the grip — it is the drag source. */
  handleProps: React.HTMLAttributes<HTMLElement> & { draggable: boolean };
  /** True for the row currently being dragged, for dimming it. */
  isDragging: boolean;
  /** Set on the row the dragged item would land against, for the indicator. */
  dropEdge: DropEdge | null;
}

export interface UseDragReorderOptions {
  /** The list, in its current order. */
  ids: string[];
  /**
   * Rows that may be picked up. Defaults to all of them. A row that returns
   * false is still a valid place to drop — it just cannot be moved itself.
   */
  canDrag?: (id: string) => boolean;
  /** Called with the whole list in its new order. Not called for a no-op drop. */
  onReorder: (nextIds: string[]) => void;
}

export interface UseDragReorderResult {
  getItemProps: (id: string) => DragReorderItemProps;
  /** Move a row by `delta` places. Clamped, and a no-op for undraggable rows. */
  move: (id: string, delta: number) => void;
  /** True while a drag is in progress. */
  isDragging: boolean;
}

export function useDragReorder({
  ids,
  canDrag,
  onReorder,
}: UseDragReorderOptions): UseDragReorderResult {
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<{ id: string; edge: DropEdge } | null>(
    null,
  );

  const reset = React.useCallback(() => {
    setDragId(null);
    setOver(null);
  }, []);

  const commit = React.useCallback(
    (sourceId: string, targetId: string, edge: DropEdge) => {
      if (sourceId === targetId) return;
      const next = ids.filter((id) => id !== sourceId);
      const targetIndex = next.indexOf(targetId);
      if (targetIndex === -1) return;
      const insertAt = edge === "bottom" ? targetIndex + 1 : targetIndex;
      next.splice(insertAt, 0, sourceId);
      // Dropping a row back where it started is a no-op, not an edit — firing
      // the callback anyway would send a pointless request on every misfire.
      const unchanged = next.every((id, index) => id === ids[index]);
      if (unchanged) return;
      onReorder(next);
    },
    [ids, onReorder],
  );

  const move = React.useCallback(
    (id: string, delta: number) => {
      const from = ids.indexOf(id);
      if (from === -1) return;
      if (canDrag && !canDrag(id)) return;
      const to = from + delta;
      if (to < 0 || to >= ids.length) return;
      const next = [...ids];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      onReorder(next);
    },
    [ids, canDrag, onReorder],
  );

  const getItemProps = React.useCallback(
    (id: string): DragReorderItemProps => {
      const draggable = canDrag ? canDrag(id) : true;

      return {
        isDragging: dragId === id,
        dropEdge: over && over.id === id && dragId !== id ? over.edge : null,
        handleProps: {
          draggable,
          onDragStart: (event: React.DragEvent) => {
            if (!draggable) {
              event.preventDefault();
              return;
            }
            event.dataTransfer.effectAllowed = "move";
            // Firefox ignores a drag that carries no payload.
            event.dataTransfer.setData("text/plain", id);
            // Drag the whole row, not the little grip the pointer is on.
            const row = (event.currentTarget as HTMLElement).closest(
              "[data-reorder-item]",
            );
            if (row instanceof HTMLElement) {
              const rect = row.getBoundingClientRect();
              event.dataTransfer.setDragImage(
                row,
                event.clientX - rect.left,
                event.clientY - rect.top,
              );
            }
            setDragId(id);
          },
          onDragEnd: reset,
        },
        containerProps: {
          "data-reorder-item": "",
          onDragOver: (event: React.DragEvent) => {
            if (dragId === null || dragId === id) return;
            // Without preventDefault the browser refuses the drop outright.
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            // Which half of the row the pointer is over decides whether the
            // dragged row lands above or below it. Insert-before-only feels
            // wrong dragging downwards: the row stops one place short of
            // where the pointer is.
            const rect = event.currentTarget.getBoundingClientRect();
            const edge: DropEdge =
              event.clientY > rect.top + rect.height / 2 ? "bottom" : "top";
            setOver((current) =>
              current && current.id === id && current.edge === edge
                ? current
                : { id, edge },
            );
          },
          onDrop: (event: React.DragEvent) => {
            event.preventDefault();
            const source = dragId;
            const edge = over?.edge ?? "top";
            reset();
            if (source) commit(source, id, edge);
          },
        } as React.HTMLAttributes<HTMLElement>,
      };
    },
    [dragId, over, reset, commit, canDrag],
  );

  return { getItemProps, move, isDragging: dragId !== null };
}
