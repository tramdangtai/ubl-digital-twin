"use client";

import { useEffect, useRef } from "react";

import { useFixtures } from "@/lib/api/hooks/use-fixtures";
import { useStores } from "@/lib/api/hooks/use-stores";
import { OWNER_VISUAL } from "@/lib/constants";
import { fixtureScreenRect, pxToMm } from "@/lib/rendering/coordinates";
import { useFixtureDraftStore } from "@/lib/state/fixture-draft";
import { useSelectionStore } from "@/lib/state/selection";
import { useWorkspaceViewStore } from "@/lib/state/workspace-view";
import type { Fixture } from "@/lib/types/entities";

interface FixtureGeometry {
  positionX: number;
  positionY: number;
  widthMm: number;
  depthMm: number;
  rotationDegree: number;
}

export function Workspace() {
  const { selectedStoreId, selectedFixtureId, mode, selectFixture } = useSelectionStore();
  const { data: stores } = useStores();
  const { data: fixtures } = useFixtures(selectedStoreId ?? undefined);
  const store = stores?.find((s) => s.storeId === selectedStoreId);

  const { scale, panX, panY, zoomBy, panBy, resetView } = useWorkspaceViewStore();
  const { editingFixtureId, draft } = useFixtureDraftStore();

  const containerRef = useRef<HTMLDivElement>(null);

  // Wheel zoom — native listener non-passive để preventDefault chặn page scroll.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1.1 : 0.9);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  // Pan bằng kéo nền canvas (không phải kéo Fixture — xem stopPropagation trong FixtureShape).
  const panDragRef = useRef<{ lastX: number; lastY: number } | null>(null);
  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!panDragRef.current) return;
      const dx = e.clientX - panDragRef.current.lastX;
      const dy = e.clientY - panDragRef.current.lastY;
      panDragRef.current = { lastX: e.clientX, lastY: e.clientY };
      panBy(dx, dy);
    }
    function onUp() {
      panDragRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [panBy]);

  if (!store) {
    return (
      <div className="flex h-full flex-1 flex-col bg-background">
        <WorkspaceHeader />
        <div className="flex flex-1 items-center justify-center">
          {mode !== "view" ? (
            <p className="text-sm text-muted">Đang tạo mới ở Inspector →</p>
          ) : (
            <p className="max-w-xs text-center text-sm text-muted">
              Chọn hoặc tạo một Store ở Explorer để bắt đầu.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      <WorkspaceHeader
        title={store.storeName}
        scale={scale}
        onZoomIn={() => zoomBy(1.25)}
        onZoomOut={() => zoomBy(0.8)}
        onReset={resetView}
      />
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        <svg
          className="h-full w-full cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={(e) => {
            panDragRef.current = { lastX: e.clientX, lastY: e.clientY };
          }}
        >
          <GridBackground scale={scale} panX={panX} panY={panY} />

          {fixtures?.map((f) => {
            const isEditing = editingFixtureId === f.fixtureId;
            const geometry: FixtureGeometry =
              isEditing && draft
                ? {
                    positionX: draft.positionX,
                    positionY: draft.positionY,
                    widthMm: draft.widthMm,
                    depthMm: draft.depthMm,
                    rotationDegree: draft.rotationDegree,
                  }
                : {
                    positionX: f.positionX,
                    positionY: f.positionY,
                    widthMm: f.widthMm,
                    depthMm: f.depthMm,
                    rotationDegree: f.rotationDegree,
                  };

            return (
              <FixtureShape
                key={f.fixtureId}
                fixture={f}
                geometry={geometry}
                scale={scale}
                panX={panX}
                panY={panY}
                selected={selectedFixtureId === f.fixtureId}
                editing={isEditing}
                onSelect={() => selectFixture(f.fixtureId)}
              />
            );
          })}
        </svg>

        {(fixtures?.length ?? 0) === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted">
              Chưa có Fixture. Bấm “+ Add Fixture” ở Explorer để tạo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkspaceHeader({
  title,
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  title?: string;
  scale?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onReset?: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Workspace</span>
        {title && <span className="ml-2 text-sm font-medium text-ubl-secondary">{title}</span>}
      </div>
      {scale !== undefined && (
        <div className="flex items-center gap-1">
          <button
            onClick={onZoomOut}
            className="rounded border border-border px-2 py-0.5 text-xs hover:bg-muted-bg"
          >
            −
          </button>
          <span className="w-12 text-center text-xs text-muted">{Math.round(scale * 100)}%</span>
          <button
            onClick={onZoomIn}
            className="rounded border border-border px-2 py-0.5 text-xs hover:bg-muted-bg"
          >
            +
          </button>
          <button
            onClick={onReset}
            className="ml-1 rounded border border-border px-2 py-0.5 text-xs hover:bg-muted-bg"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

function GridBackground({ scale, panX, panY }: { scale: number; panX: number; panY: number }) {
  const gridMm = 500; // lưới 500mm — mốc dễ đọc cho merchandising
  const gridPx = gridMm * scale;
  return (
    <>
      <defs>
        <pattern
          id="workspace-grid"
          width={gridPx}
          height={gridPx}
          patternUnits="userSpaceOnUse"
          x={panX}
          y={panY}
        >
          <path d={`M ${gridPx} 0 L 0 0 0 ${gridPx}`} fill="none" stroke="#e2e8f0" strokeWidth={1} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#workspace-grid)" />
      <circle cx={panX} cy={panY} r={3} fill="#94a3b8" />
    </>
  );
}

function FixtureShape({
  fixture,
  geometry,
  scale,
  panX,
  panY,
  selected,
  editing,
  onSelect,
}: {
  fixture: Fixture;
  geometry: FixtureGeometry;
  scale: number;
  panX: number;
  panY: number;
  selected: boolean;
  editing: boolean;
  onSelect: () => void;
}) {
  const { updateDraft } = useFixtureDraftStore();
  const rect = fixtureScreenRect(geometry, scale, panX, panY);
  const visual = OWNER_VISUAL[fixture.ownerCompany];

  // Ref giữ giá trị mới nhất để pointermove handler không cần re-attach mỗi
  // lần geometry đổi trong lúc kéo (tránh giật/rớt frame khi drag nhanh).
  const geometryRef = useRef(geometry);
  geometryRef.current = geometry;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const dragRef = useRef<{ lastX: number; lastY: number } | null>(null);

  useEffect(() => {
    if (!editing) return;
    function onMove(e: PointerEvent) {
      if (!dragRef.current) return;
      const dxPx = e.clientX - dragRef.current.lastX;
      const dyPx = e.clientY - dragRef.current.lastY;
      dragRef.current = { lastX: e.clientX, lastY: e.clientY };
      updateDraft({
        positionX: geometryRef.current.positionX + pxToMm(dxPx, scaleRef.current),
        positionY: geometryRef.current.positionY + pxToMm(dyPx, scaleRef.current),
      });
    }
    function onUp() {
      dragRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [editing, updateDraft]);

  return (
    <g
      transform={rect.transform}
      onPointerDown={(e) => {
        // Không cho canvas nền bắt sự kiện này (sẽ kích hoạt pan thay vì drag Fixture).
        e.stopPropagation();
        onSelect();
        if (editing) {
          dragRef.current = { lastX: e.clientX, lastY: e.clientY };
        }
      }}
      className={editing ? "cursor-move" : "cursor-pointer"}
    >
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        fill={visual.fill}
        stroke={visual.border}
        strokeWidth={selected ? 2.5 : 1.5}
        strokeDasharray={editing ? "6 3" : undefined}
        rx={2}
      />
      {selected && (
        <rect
          x={rect.x - 3}
          y={rect.y - 3}
          width={rect.width + 6}
          height={rect.height + 6}
          fill="none"
          stroke="#e85d04"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          rx={4}
        />
      )}
      {rect.width > 40 && (
        <text x={rect.x + 6} y={rect.y + 14} fontSize={11} fill="#0f172a" className="select-none">
          {fixture.fixtureCode}
        </text>
      )}
      {editing && (
        <text x={rect.x} y={rect.y - 6} fontSize={10} fill="#e85d04" fontWeight={600}>
          Draft
        </text>
      )}
    </g>
  );
}
