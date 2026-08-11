"use client";

import { useCallback, useEffect, useRef } from "react";

interface ResizeHandleProps {
  onDrag: (deltaPx: number) => void;
}

/**
 * Divider kéo để đổi độ rộng panel liền kề. `onDrag` nhận delta X kể từ lần
 * pointermove trước đó (không phải delta tuyệt đối từ lúc bắt đầu kéo), để
 * component cha (Zustand store) tự cộng dồn + clamp min/max độc lập.
 */
export function ResizeHandle({ onDrag }: ResizeHandleProps) {
  const lastX = useRef(0);
  const draggingRef = useRef(false);
  const onDragRef = useRef(onDrag);
  onDragRef.current = onDrag;

  const stopDragging = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (!draggingRef.current) return;
      const delta = e.clientX - lastX.current;
      lastX.current = e.clientX;
      onDragRef.current(delta);
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDragging);
    };
  }, [stopDragging]);

  return (
    <div
      onPointerDown={(e) => {
        draggingRef.current = true;
        lastX.current = e.clientX;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }}
      role="separator"
      aria-orientation="vertical"
      className="relative w-1 shrink-0 cursor-col-resize bg-border transition-colors hover:bg-ubl-primary/50 active:bg-ubl-primary"
    >
      {/* Vùng bắt sự kiện rộng hơn line hiển thị, dễ nhắm chuột hơn */}
      <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
    </div>
  );
}
