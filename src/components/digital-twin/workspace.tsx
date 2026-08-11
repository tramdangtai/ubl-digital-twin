"use client";

import { useEffect, useRef } from "react";

import { useDisplayPositions } from "@/lib/api/hooks/use-display-positions";
import { useFixtures } from "@/lib/api/hooks/use-fixtures";
import { useProductAssignments } from "@/lib/api/hooks/use-product-assignments";
import { useProduct } from "@/lib/api/hooks/use-products";
import { useStores } from "@/lib/api/hooks/use-stores";
import { useSurfaces } from "@/lib/api/hooks/use-surfaces";
import { OWNER_VISUAL } from "@/lib/constants";
import { fixtureScreenRect, positionScreenRect, pxToMm } from "@/lib/rendering/coordinates";
import type { BulkGenerateDraft } from "@/lib/state/bulk-generate-draft";
import { useBulkGenerateDraftStore } from "@/lib/state/bulk-generate-draft";
import { useDisplayPositionDraftStore } from "@/lib/state/display-position-draft";
import { useFixtureDraftStore } from "@/lib/state/fixture-draft";
import { useSelectionStore } from "@/lib/state/selection";
import { useWorkspaceViewStore } from "@/lib/state/workspace-view";
import type { DisplayPosition, Fixture, Surface } from "@/lib/types/entities";

interface FixtureGeometry {
  positionX: number;
  positionY: number;
  widthMm: number;
  depthMm: number;
  rotationDegree: number;
}

interface PositionGeometry {
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;
}

export function Workspace() {
  const {
    selectedStoreId,
    selectedFixtureId,
    selectedSurfaceId,
    selectedDisplayPositionId,
    mode,
    selectFixture,
    selectDisplayPosition,
  } = useSelectionStore();
  const { data: stores } = useStores();
  const { data: fixtures } = useFixtures(selectedStoreId ?? undefined);
  const { data: surfaces } = useSurfaces(selectedFixtureId ?? undefined);
  const { data: positions } = useDisplayPositions(selectedSurfaceId ?? undefined);
  const store = stores?.find((s) => s.storeId === selectedStoreId);
  const surface = surfaces?.find((s) => s.surfaceId === selectedSurfaceId);

  const { scale, panX, panY, zoomBy, panBy, resetView } = useWorkspaceViewStore();
  const { editingFixtureId, draft: fixtureDraft } = useFixtureDraftStore();
  const { editingPositionId, draft: positionDraft } = useDisplayPositionDraftStore();
  const { draft: bulkDraft } = useBulkGenerateDraftStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const isSurfaceView = Boolean(selectedSurfaceId && surface);

  // Đổi context giữa floor-plan (Store) và Surface View là đổi hệ tọa độ hoàn
  // toàn khác nhau (mm khác nhau, gốc khác nhau) — reset zoom/pan để tránh
  // scale/pan cũ từ context trước gây khó hiểu.
  const prevContextRef = useRef<"store" | "surface" | null>(null);
  useEffect(() => {
    const current: "store" | "surface" | null = isSurfaceView ? "surface" : store ? "store" : null;
    if (current && prevContextRef.current && current !== prevContextRef.current) {
      resetView();
    }
    prevContextRef.current = current;
  }, [isSurfaceView, store, resetView]);

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

  // Pan bằng kéo nền canvas (không phải kéo Fixture — xem stopPropagation trong các Shape).
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

  let title: string;
  let content: React.ReactNode;
  let emptyMessage: string | null = null;

  if (isSurfaceView && surface) {
    title = `${store.storeName} — ${surface.surfaceName || surface.orientation}`;
    content = (
      <>
        <SurfaceBoundsShape surface={surface} scale={scale} panX={panX} panY={panY} />

        {positions?.map((p) => {
          const editing = editingPositionId === p.positionId;
          const geometry: PositionGeometry =
            editing && positionDraft
              ? {
                  x: positionDraft.x,
                  y: positionDraft.y,
                  widthMm: positionDraft.widthMm,
                  heightMm: positionDraft.heightMm,
                }
              : { x: p.x, y: p.y, widthMm: p.widthMm, heightMm: p.heightMm };

          return (
            <DisplayPositionShape
              key={p.positionId}
              position={p}
              geometry={geometry}
              scale={scale}
              panX={panX}
              panY={panY}
              selected={selectedDisplayPositionId === p.positionId}
              editing={editing}
              onSelect={() => selectDisplayPosition(surface.surfaceId, p.positionId)}
            />
          );
        })}

        {bulkDraft && <BulkGeneratePreview draft={bulkDraft} scale={scale} panX={panX} panY={panY} />}
      </>
    );
    if ((positions?.length ?? 0) === 0 && !bulkDraft) {
      emptyMessage =
        "Chưa có Display Position. Bấm “+ Add Display Position” hoặc “+ Bulk Generate...” ở Explorer.";
    }
  } else {
    title = store.storeName;
    content = (
      <>
        {fixtures?.map((f) => {
          const isEditing = editingFixtureId === f.fixtureId;
          const geometry: FixtureGeometry =
            isEditing && fixtureDraft
              ? {
                  positionX: fixtureDraft.positionX,
                  positionY: fixtureDraft.positionY,
                  widthMm: fixtureDraft.widthMm,
                  depthMm: fixtureDraft.depthMm,
                  rotationDegree: fixtureDraft.rotationDegree,
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
      </>
    );
    if ((fixtures?.length ?? 0) === 0) {
      emptyMessage = "Chưa có Fixture. Bấm “+ Add Fixture” ở Explorer để tạo.";
    }
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      <WorkspaceHeader
        title={title}
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
          {content}
        </svg>

        {emptyMessage && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="max-w-xs text-center text-sm text-muted">{emptyMessage}</p>
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

/** Viền mặt Surface (0,0 → widthMm,heightMm) — bối cảnh cho các Display Position bên trong. */
function SurfaceBoundsShape({
  surface,
  scale,
  panX,
  panY,
}: {
  surface: Surface;
  scale: number;
  panX: number;
  panY: number;
}) {
  const rect = positionScreenRect(
    { x: 0, y: 0, widthMm: surface.widthMm, heightMm: surface.heightMm },
    scale,
    panX,
    panY
  );
  return (
    <rect
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      fill="#ffffff"
      stroke="#1a365d"
      strokeWidth={2}
    />
  );
}

function DisplayPositionShape({
  position,
  geometry,
  scale,
  panX,
  panY,
  selected,
  editing,
  onSelect,
}: {
  position: DisplayPosition;
  geometry: PositionGeometry;
  scale: number;
  panX: number;
  panY: number;
  selected: boolean;
  editing: boolean;
  onSelect: () => void;
}) {
  const rect = positionScreenRect(geometry, scale, panX, panY);

  // Part 07 §16-17: Display Position có Active Assignment → render Product;
  // trống → render Empty placeholder. Không tự tạo Assignment ở đây, chỉ đọc.
  const { data: assignments } = useProductAssignments(position.positionId);
  const active = assignments?.find((a) => a.status === "Active");
  const { data: activeProduct } = useProduct(active?.productId);

  const occupiedFill = "#dcfce7";
  const occupiedStroke = "#16a34a";
  const emptyFill = "#eef2ff";
  const emptyStroke = "#6366f1";

  return (
    <g
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className="cursor-pointer"
    >
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        fill={active ? occupiedFill : emptyFill}
        stroke={active ? occupiedStroke : emptyStroke}
        strokeWidth={selected ? 2.5 : 1.25}
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
      {rect.width > 30 && (
        <text
          x={rect.x + 4}
          y={rect.y + 12}
          fontSize={9}
          fill={active ? "#14532d" : "#312e81"}
          className="select-none"
        >
          {active ? activeProduct?.description ?? "..." : position.displayType}
        </text>
      )}
      {active && rect.width > 30 && rect.height > 26 && (
        <text x={rect.x + 4} y={rect.y + 23} fontSize={8} fill="#166534" className="select-none">
          {activeProduct?.itemCode ?? ""}
        </text>
      )}
      {editing && (
        <text x={rect.x} y={rect.y - 4} fontSize={9} fill="#e85d04" fontWeight={600}>
          Draft
        </text>
      )}
    </g>
  );
}

/** Preview lưới Bulk Generate — Draft, chưa Save, chỉ vẽ viền chấm (Part 04 §7.2). */
function BulkGeneratePreview({
  draft,
  scale,
  panX,
  panY,
}: {
  draft: BulkGenerateDraft;
  scale: number;
  panX: number;
  panY: number;
}) {
  const cells: React.ReactNode[] = [];
  for (let row = 0; row < draft.rows; row++) {
    for (let col = 0; col < draft.columns; col++) {
      const x = draft.startX + col * (draft.cellWidthMm + draft.gapXMm);
      const y = draft.startY + row * (draft.cellHeightMm + draft.gapYMm);
      const rect = positionScreenRect(
        { x, y, widthMm: draft.cellWidthMm, heightMm: draft.cellHeightMm },
        scale,
        panX,
        panY
      );
      cells.push(
        <rect
          key={`${row}-${col}`}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill="rgba(232, 93, 4, 0.08)"
          stroke="#e85d04"
          strokeWidth={1}
          strokeDasharray="3 2"
          rx={2}
        />
      );
    }
  }
  return <>{cells}</>;
}
