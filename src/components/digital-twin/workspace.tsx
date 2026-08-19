"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { canWrite, useCurrentUser } from "@/lib/api/hooks/use-current-user";
import { useDisplayPositions } from "@/lib/api/hooks/use-display-positions";
import { useFixtures } from "@/lib/api/hooks/use-fixtures";
import { useSurfaceAssignments } from "@/lib/api/hooks/use-product-assignments";
import { useRetailers } from "@/lib/api/hooks/use-retailers";
import { useStores } from "@/lib/api/hooks/use-stores";
import { useSurfaces } from "@/lib/api/hooks/use-surfaces";
import { backgroundImageUrl } from "@/lib/api/hooks/use-background-images";
import { OWNER_VISUAL } from "@/lib/constants";
import { buildSurfaceCsv } from "@/lib/export/surface-csv";
import { buildSurfaceExportBaseName } from "@/lib/export/filename";
import { downloadBlob } from "@/lib/export/download";
import { exportSurfacePng } from "@/lib/export/surface-png";
import type { SurfaceExportContext } from "@/lib/export/types";
import { fixtureScreenRect, positionScreenRect, pxToMm } from "@/lib/rendering/coordinates";
import {
  EMPTY_FILL,
  EMPTY_STROKE,
  EMPTY_TEXT,
  OCCUPIED_FILL,
  OCCUPIED_STROKE,
  OCCUPIED_TEXT,
  PENDING_FILL,
  PENDING_STROKE,
  PENDING_TEXT,
  REJECTED_FILL,
  REJECTED_STROKE,
  REJECTED_TEXT,
} from "@/lib/rendering/colors";
import { useImageStatus } from "@/lib/rendering/use-image-status";
import {
  MAX_PENDING_ASSIGNMENTS,
  PRODUCT_DND_MIME,
  useBulkAssignDraftStore,
  type PendingAssignment,
  type StampProductRef,
  type StampRejectReason,
} from "@/lib/state/bulk-assign-draft";
import { BulkAssignBar } from "./bulk-assign-bar";
import type { BulkGenerateDraft } from "@/lib/state/bulk-generate-draft";
import { useBulkGenerateDraftStore } from "@/lib/state/bulk-generate-draft";
import { useDisplayPositionDraftStore } from "@/lib/state/display-position-draft";
import { useFixtureDraftStore } from "@/lib/state/fixture-draft";
import { useSelectionStore } from "@/lib/state/selection";
import {
  CELL_FILL_OPACITY,
  CELL_OPACITY_LABELS,
  CELL_OPACITY_ORDER,
  CELL_STROKE_VISIBLE,
  useSurfaceViewModeStore,
  type CellOpacityLevel,
  type SurfaceCellMode,
} from "@/lib/state/surface-view-mode";
import { useWorkspaceViewStore } from "@/lib/state/workspace-view";
import type { AssignmentWithProduct, DisplayPosition, Fixture, Surface } from "@/lib/types/entities";

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
    clearDisplayPositionSelection,
    startBulkAssignProduct,
  } = useSelectionStore();
  const { data: me } = useCurrentUser();
  const writable = canWrite(me?.role);
  const { data: retailers } = useRetailers();
  const storesQuery = useStores();
  const { data: stores } = storesQuery;
  const fixturesQuery = useFixtures(selectedStoreId ?? undefined);
  const { data: fixtures } = fixturesQuery;
  const { data: surfaces } = useSurfaces(selectedFixtureId ?? undefined);
  const positionsQuery = useDisplayPositions(selectedSurfaceId ?? undefined);
  const { data: positions } = positionsQuery;

  // Giai đoạn 8 A2: 1 query thay vì N+1 per-position.
  const assignmentsQuery = useSurfaceAssignments(selectedSurfaceId ?? undefined);
  const { data: surfaceAssignments } = assignmentsQuery;

  const store = stores?.find((s) => s.storeId === selectedStoreId);
  const fixture = fixtures?.find((f) => f.fixtureId === selectedFixtureId);
  const surface = surfaces?.find((s) => s.surfaceId === selectedSurfaceId);
  const retailer = retailers?.find((r) => r.retailerId === store?.retailerId);

  // Map<positionId, AssignmentWithProduct> cho O(1) lookup trong DisplayPositionShape.
  // useMemo để pan/zoom không dựng lại Map hàng trăm phần tử mỗi frame.
  const assignmentMap = useMemo(() => {
    const map = new Map<string, AssignmentWithProduct>();
    for (const a of surfaceAssignments ?? []) map.set(a.positionId, a);
    return map;
  }, [surfaceAssignments]);

  const { scale, panX, panY, zoomBy, zoomAt, panBy, fitTo, resetView } = useWorkspaceViewStore();
  const { editingFixtureId, draft: fixtureDraft } = useFixtureDraftStore();
  const { editingPositionId, draft: positionDraft } = useDisplayPositionDraftStore();
  const { draft: bulkDraft } = useBulkGenerateDraftStore();
  const { cellMode, setCellMode, cellOpacity, setCellOpacity } = useSurfaceViewModeStore();

  const containerRef = useRef<HTMLDivElement>(null);
  // State song song với ref: effect cần biết THỜI ĐIỂM container xuất hiện,
  // mà thay đổi của ref thì không kích hoạt effect.
  const [canvasEl, setCanvasEl] = useState<HTMLDivElement | null>(null);
  const setCanvasRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
    setCanvasEl(el);
  }, []);
  const isSurfaceView = Boolean(selectedSurfaceId && surface);

  // Gán hàng loạt. Nguồn sự thật là surfaceId của draft store (không phải
  // selection.mode) — xem ghi chú ở startBulkAssignProduct trong selection.ts.
  const bulkAssign = useBulkAssignDraftStore();
  const stampMode = bulkAssign.surfaceId !== null && bulkAssign.surfaceId === selectedSurfaceId;
  const pendingCount = Object.keys(bulkAssign.pending).length;

  // Flash đỏ khi bấm bị từ chối rồi tự tắt. Gom 1 timer ở đây thay vì mỗi ô một
  // timer riêng — tránh rò timer khi hàng trăm ô unmount lúc đổi Surface.
  const rejectedKeys = Object.keys(bulkAssign.rejected).join(",");
  useEffect(() => {
    if (!rejectedKeys) return;
    const ids = rejectedKeys.split(",");
    const timer = setTimeout(() => {
      const store = useBulkAssignDraftStore.getState();
      for (const id of ids) store.clearRejected(id);
    }, 1600);
    return () => clearTimeout(timer);
  }, [rejectedKeys]);

  // Export state
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  /**
   * Tự canh vừa khung mỗi khi mở một Surface KHÁC.
   *
   * Trước đây mọi Surface đều mở ở 25% với pan cố định (40,40) — Surface cao
   * 2100mm chỉ hiện 525px, còn đổi giữa 2 Surface thì giữ nguyên zoom/pan cũ
   * nên Surface mới có thể nằm ngoài tầm nhìn. Khoá theo surfaceId để không
   * đè lên zoom/pan mà user tự chỉnh trong lúc làm việc.
   */
  const fittedSurfaceRef = useRef<string | null>(null);
  useEffect(() => {
    // canvasEl (state) chứ không phải containerRef — cùng lý do với wheel listener.
    if (!isSurfaceView || !surface || !canvasEl) return;
    if (fittedSurfaceRef.current === surface.surfaceId) return;
    const box = canvasEl.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    fitTo(surface.widthMm, surface.heightMm, box.width, box.height);
    fittedSurfaceRef.current = surface.surfaceId;
  }, [isSurfaceView, surface, fitTo, canvasEl]);

  // Đổi context giữa floor-plan (Store) và Surface View là đổi hệ tọa độ hoàn
  // toàn khác nhau (mm khác nhau, gốc khác nhau) — reset zoom/pan để tránh
  // scale/pan cũ từ context trước gây khó hiểu.
  const prevContextRef = useRef<"store" | "surface" | null>(null);
  useEffect(() => {
    const current: "store" | "surface" | null = isSurfaceView ? "surface" : store ? "store" : null;
    if (current && prevContextRef.current && current !== prevContextRef.current) {
      // Rời Surface View → quên fit cũ để lần sau quay lại canh lại từ đầu.
      if (current === "store") {
        fittedSurfaceRef.current = null;
        resetView();
      }
    }
    prevContextRef.current = current;
  }, [isSurfaceView, store, resetView]);

  /**
   * Wheel zoom — native listener non-passive để preventDefault chặn page scroll.
   * Zoom bám con trỏ: điểm dưới chuột đứng yên, thay vì nội dung trôi đi như trước.
   *
   * Phải phụ thuộc vào `canvasEl` (state) chứ KHÔNG phải `containerRef.current`:
   * lúc chưa chọn Store, component return sớm nên container chưa tồn tại; ref
   * thay đổi không làm effect chạy lại, nên listener sẽ không bao giờ được gắn
   * và lăn chuột mất tác dụng. Đây là bug có sẵn, phát hiện khi test tay.
   */
  useEffect(() => {
    const el = canvasEl;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const box = el!.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.1 : 0.9, e.clientX - box.left, e.clientY - box.top);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt, canvasEl]);

  /**
   * Esc = bỏ chọn / thoát phiên dán. Trước đây không có cách nào bỏ chọn một
   * Display Position (bấm nền chỉ pan) nên viền cam cứ dính mãi.
   */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const t = e.target as HTMLElement | null;
      // Đang gõ trong ô nhập thì Esc thuộc về ô đó, không phải canvas.
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (useBulkAssignDraftStore.getState().surfaceId !== null) return; // thanh gán tự lo
      if (selectedDisplayPositionId) clearDisplayPositionSelection();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedDisplayPositionId, clearDisplayPositionSelection]);

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

  async function handleExportCsv() {
    if (!surface || !retailer || !store || !fixture || !positions) return;
    setIsExportingCsv(true);
    try {
      const ctx: SurfaceExportContext = {
        retailer,
        store,
        fixture,
        surface,
        positions,
        assignmentByPositionId: assignmentMap,
      };
      const csvStr = buildSurfaceCsv(ctx);
      const bom = "﻿";
      const blob = new Blob([bom + csvStr], { type: "text/csv;charset=utf-8;" });
      const baseName = buildSurfaceExportBaseName(ctx);
      downloadBlob(blob, `${baseName}.csv`);
    } catch (e) {
      alert(`Xuất CSV thất bại: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsExportingCsv(false);
    }
  }

  async function handleExportPng() {
    if (!surface || !retailer || !store || !fixture || !positions) return;
    setIsExportingPng(true);
    try {
      const ctx: SurfaceExportContext = {
        retailer,
        store,
        fixture,
        surface,
        positions,
        assignmentByPositionId: assignmentMap,
      };
      const blob = await exportSurfacePng(ctx, {
        cellMode,
        // Ảnh xuất ra phải giống hệt thứ user đang nhìn trên canvas.
        cellFillOpacity: CELL_FILL_OPACITY[cellOpacity],
        cellStrokeVisible: CELL_STROKE_VISIBLE[cellOpacity],
      });
      const baseName = buildSurfaceExportBaseName(ctx);
      downloadBlob(blob, `${baseName}.png`);
    } catch (e) {
      alert(`Xuất PNG thất bại: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsExportingPng(false);
    }
  }

  /**
   * Một cú bấm trong chế độ dán. Mọi kiểm tra nghiệp vụ nằm ở đây (không phải
   * trong store — store chỉ giữ UI state, nguyên tắc #6). Backend vẫn validate
   * lại toàn bộ khi Lưu (nguyên tắc #5).
   */
  function handleStamp(p: DisplayPosition) {
    const draft = useBulkAssignDraftStore.getState();
    const alreadyPending = Boolean(draft.pending[p.positionId]);

    if (!draft.currentProduct) {
      draft.markRejected(p.positionId, "NO_PRODUCT");
      return;
    }
    if (p.status !== "Active") {
      draft.markRejected(p.positionId, "POSITION_NOT_ACTIVE");
      return;
    }
    if (!alreadyPending && Object.keys(draft.pending).length >= MAX_PENDING_ASSIGNMENTS) {
      draft.markRejected(p.positionId, "LIMIT_REACHED");
      return;
    }
    // Ô đã có hàng vẫn dán được — sẽ THAY THẾ sản phẩm cũ khi Lưu. Đánh dấu để
    // ô hiện rõ là "thay thế" và user bỏ được trước khi Lưu; không ghi đè âm thầm.
    const current = assignmentMap.get(p.positionId);
    draft.stampPosition(
      p.positionId,
      current && !alreadyPending ? { itemCode: current.product.itemCode } : undefined
    );
  }

  /**
   * Thả một Product từ Product Library vào ô.
   *
   * Đi qua đúng Draft của gán hàng loạt: nếu chưa có phiên thì mở phiên mới với
   * sản phẩm vừa thả. Nhờ vậy thả xong vẫn là ô cam "chờ lưu", vẫn phải bấm Lưu
   * mới ghi DB — không phá nguyên tắc Draft → Save, và tái dùng luôn toàn bộ
   * đường Save/Huỷ/undo đã có thay vì dựng luồng ghi thứ hai.
   */
  function handleDropProduct(p: DisplayPosition, product: StampProductRef) {
    if (!writable || !selectedSurfaceId) return;
    const draft = useBulkAssignDraftStore.getState();
    if (draft.surfaceId !== selectedSurfaceId) {
      startBulkAssignProduct(selectedSurfaceId, product);
    } else {
      draft.setCurrentProduct(product);
    }
    handleStamp(p);
  }

  if (!store) {
    // Lỗi tải danh sách Store trông y hệt "chưa chọn Store" nếu không tách ra —
    // user sẽ tưởng mất dữ liệu. Phải nói rõ và cho đường thử lại.
    const storesFailed = storesQuery.isError;
    return (
      <div className="flex h-full flex-1 flex-col bg-background">
        <WorkspaceHeader />
        <div className="flex flex-1 items-center justify-center">
          {storesFailed ? (
            <CanvasErrorState
              message="Không tải được danh sách Store."
              onRetry={() => storesQuery.refetch()}
              isRetrying={storesQuery.isFetching}
            />
          ) : storesQuery.isLoading ? (
            <p className="text-sm text-muted">Đang tải...</p>
          ) : mode !== "view" ? (
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
  /** Lỗi tải dữ liệu của canvas — ưu tiên cao hơn emptyMessage. */
  let errorState: { message: string; onRetry: () => void; isRetrying: boolean } | null = null;

  if (isSurfaceView && surface) {
    title = `${store.storeName} — ${surface.surfaceName || surface.orientation}`;
    content = (
      <>
        <SurfaceBoundsShape surface={surface} scale={scale} panX={panX} panY={panY} />

        {/* Giai đoạn 9 — ảnh nền Surface (đặt TRƯỚC Display Positions để ở dưới cùng DOM). */}
        {surface.backgroundImageId && (
          <SurfaceBackgroundImage surface={surface} scale={scale} panX={panX} panY={panY} />
        )}

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
              assignment={assignmentMap.get(p.positionId)}
              cellMode={cellMode}
              fillOpacity={CELL_FILL_OPACITY[cellOpacity]}
              strokeVisible={CELL_STROKE_VISIBLE[cellOpacity]}
              stampMode={stampMode}
              pending={bulkAssign.pending[p.positionId]}
              rejectReason={bulkAssign.rejected[p.positionId]}
              itemError={bulkAssign.itemErrors[p.positionId]}
              onSelect={() => selectDisplayPosition(surface.surfaceId, p.positionId)}
              onStamp={() => handleStamp(p)}
              onDropProduct={writable ? (prod) => handleDropProduct(p, prod) : undefined}
              // Ô đã có hàng vẫn nhận thả (sẽ thay thế). Chỉ chặn ô đã Archived.
              dropDisabled={p.status !== "Active"}
              dropReplaces={
                assignmentMap.has(p.positionId) && !bulkAssign.pending[p.positionId]
              }
            />
          );
        })}

        {bulkDraft && <BulkGeneratePreview draft={bulkDraft} scale={scale} panX={panX} panY={panY} />}
      </>
    );
    // Thứ tự ưu tiên: lỗi > đang tải > thật sự trống. Trước đây gộp cả ba nên
    // mỗi lần mở Surface đều nháy "Chưa có Display Position", và lỗi API thì
    // trông y hệt Surface rỗng.
    if (positionsQuery.isError || assignmentsQuery.isError) {
      errorState = {
        message: positionsQuery.isError
          ? "Không tải được danh sách Display Position."
          : "Không tải được thông tin sản phẩm đang gán.",
        onRetry: () => {
          if (positionsQuery.isError) positionsQuery.refetch();
          if (assignmentsQuery.isError) assignmentsQuery.refetch();
        },
        isRetrying: positionsQuery.isFetching || assignmentsQuery.isFetching,
      };
    } else if (positionsQuery.isLoading) {
      emptyMessage = "Đang tải Display Position...";
    } else if ((positions?.length ?? 0) === 0 && !bulkDraft) {
      emptyMessage =
        'Chưa có Display Position. Bấm "+ Add Display Position" hoặc "+ Bulk Generate..." ở Explorer.';
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
    if (fixturesQuery.isError) {
      errorState = {
        message: "Không tải được danh sách Fixture.",
        onRetry: () => fixturesQuery.refetch(),
        isRetrying: fixturesQuery.isFetching,
      };
    } else if (fixturesQuery.isLoading) {
      emptyMessage = "Đang tải Fixture...";
    } else if ((fixtures?.length ?? 0) === 0) {
      emptyMessage = 'Chưa có Fixture. Bấm "+ Add Fixture" ở Explorer để tạo.';
    }
  }

  const exportReady =
    isSurfaceView &&
    surface &&
    retailer &&
    store &&
    fixture &&
    positions !== undefined &&
    positions.length > 0;

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      <WorkspaceHeader
        title={title}
        scale={scale}
        onZoomIn={() => zoomBy(1.25)}
        onZoomOut={() => zoomBy(0.8)}
        onReset={resetView}
        // Chỉ truyền props Surface View khi đang ở Surface View
        isSurfaceView={isSurfaceView}
        cellMode={cellMode}
        onCellModeChange={setCellMode}
        cellOpacity={cellOpacity}
        onCellOpacityChange={setCellOpacity}
        isExportingPng={isExportingPng}
        isExportingCsv={isExportingCsv}
        exportReady={!!exportReady}
        onExportPng={handleExportPng}
        onExportCsv={handleExportCsv}
        canBulkAssign={isSurfaceView && !stampMode && writable}
        onStartBulkAssign={() =>
          selectedSurfaceId && startBulkAssignProduct(selectedSurfaceId, null)
        }
        pendingCount={pendingCount}
        onFitToView={() => {
          const box = containerRef.current?.getBoundingClientRect();
          if (!box) return;
          if (isSurfaceView && surface) {
            fitTo(surface.widthMm, surface.heightMm, box.width, box.height);
          } else {
            // Floor plan: canh theo bounding box của toàn bộ Fixture đang có.
            const maxX = Math.max(...(fixtures ?? []).map((f) => f.positionX + f.widthMm), 0);
            const maxY = Math.max(...(fixtures ?? []).map((f) => f.positionY + f.depthMm), 0);
            if (maxX > 0 && maxY > 0) fitTo(maxX, maxY, box.width, box.height);
          }
        }}
      />
      {stampMode && selectedSurfaceId && <BulkAssignBar surfaceId={selectedSurfaceId} />}
      <div ref={setCanvasRef} className="relative flex-1 overflow-hidden">
        <svg
          className="h-full w-full cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={(e) => {
            panDragRef.current = { lastX: e.clientX, lastY: e.clientY };
          }}
        >
          <GridBackground scale={scale} panX={panX} panY={panY} />
          {content}
        </svg>

        {errorState ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <CanvasErrorState {...errorState} />
          </div>
        ) : (
          emptyMessage && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="max-w-xs text-center text-sm text-muted">{emptyMessage}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/**
 * Trạng thái lỗi tải dữ liệu trên canvas.
 *
 * Trước đây API lỗi và "chưa có dữ liệu" hiển thị y hệt nhau (cùng là canvas
 * trống) — user tưởng mất dữ liệu. Phải nói rõ đây là lỗi tải và cho đường thử
 * lại tại chỗ, không bắt refresh cả trang.
 */
function CanvasErrorState({
  message,
  onRetry,
  isRetrying,
}: {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <div className="max-w-xs rounded border border-red-200 bg-red-50 px-4 py-3 text-center">
      <p className="mb-1 text-sm font-medium text-red-700">{message}</p>
      <p className="mb-3 text-xs text-red-600">
        Dữ liệu vẫn còn nguyên trên máy chủ — đây là lỗi kết nối, không phải mất dữ liệu.
      </p>
      <button
        onClick={onRetry}
        disabled={isRetrying}
        className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {isRetrying ? "Đang thử lại..." : "Thử lại"}
      </button>
    </div>
  );
}

function WorkspaceHeader({
  title,
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
  isSurfaceView = false,
  cellMode,
  onCellModeChange,
  cellOpacity,
  onCellOpacityChange,
  isExportingPng = false,
  isExportingCsv = false,
  exportReady = false,
  onExportPng,
  onExportCsv,
  canBulkAssign = false,
  onStartBulkAssign,
  pendingCount = 0,
  onFitToView,
}: {
  title?: string;
  scale?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onReset?: () => void;
  isSurfaceView?: boolean;
  cellMode?: SurfaceCellMode;
  onCellModeChange?: (m: SurfaceCellMode) => void;
  cellOpacity?: CellOpacityLevel;
  onCellOpacityChange?: (o: CellOpacityLevel) => void;
  isExportingPng?: boolean;
  isExportingCsv?: boolean;
  exportReady?: boolean;
  onExportPng?: () => void;
  onExportCsv?: () => void;
  canBulkAssign?: boolean;
  onStartBulkAssign?: () => void;
  pendingCount?: number;
  onFitToView?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-y-2 border-b border-border bg-card px-4 py-2">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Workspace
        </span>
        {title && (
          <span className="truncate text-sm font-medium text-ubl-secondary" title={title}>
            {title}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* Nút Chữ / Ảnh — chỉ hiện ở Surface View */}
        {isSurfaceView && cellMode !== undefined && onCellModeChange && (
          <div className="flex items-center rounded border border-border text-xs">
            <button
              onClick={() => onCellModeChange("text")}
              className={`px-2.5 py-1.5 rounded-l ${
                cellMode === "text"
                  ? "bg-ubl-primary/10 text-ubl-secondary font-medium"
                  : "hover:bg-muted-bg"
              }`}
            >
              Chữ
            </button>
            <button
              onClick={() => onCellModeChange("image")}
              className={`px-2.5 py-1.5 rounded-r border-l border-border ${
                cellMode === "image"
                  ? "bg-ubl-primary/10 text-ubl-secondary font-medium"
                  : "hover:bg-muted-bg"
              }`}
            >
              Ảnh
            </button>
          </div>
        )}

        {/* Vào chế độ gán hàng loạt — 1 click/ô thay vì 5 click + 2 lần đổi tab */}
        {canBulkAssign && onStartBulkAssign && (
          <button
            onClick={onStartBulkAssign}
            title="Chọn 1 sản phẩm rồi bấm lần lượt các ô cần gán"
            className="rounded border border-ubl-primary/40 bg-ubl-primary/10 px-2.5 py-1.5 text-xs font-medium text-ubl-secondary hover:bg-ubl-primary/20"
          >
            ⌖ Gán hàng loạt
          </button>
        )}

        {/* Độ đậm khung. Hiện ở mọi Surface, không chỉ khi có ảnh nền: "Tắt"
            dùng để bỏ hẳn khung cho giống bản planogram dựng trên Canva. */}
        {isSurfaceView && cellOpacity && onCellOpacityChange && (
          <div
            className="flex items-center rounded border border-border text-xs"
            title="Độ đậm khung Display Position. Tắt = bỏ hẳn nền và viền, chỉ còn sản phẩm."
          >
            <span className="px-2.5 py-1.5 text-muted">Khung</span>
            {CELL_OPACITY_ORDER.map((level) => (
              <button
                key={level}
                onClick={() => onCellOpacityChange(level)}
                className={`border-l border-border px-2.5 py-1.5 last:rounded-r ${
                  cellOpacity === level
                    ? "bg-ubl-primary/10 font-medium text-ubl-secondary"
                    : "hover:bg-muted-bg"
                }`}
              >
                {CELL_OPACITY_LABELS[level]}
              </button>
            ))}
          </div>
        )}

        {/* Nút Export — chỉ hiện ở Surface View.
            Chặn khi còn ô chưa lưu: file xuất ra không được ngụ ý dữ liệu chưa
            persist là thật (nguyên tắc #8). */}
        {isSurfaceView && (
          <>
            <button
              disabled={!exportReady || isExportingCsv || pendingCount > 0}
              onClick={onExportCsv}
              title={
                pendingCount > 0
                  ? "Lưu hoặc huỷ các thay đổi đang chờ trước khi xuất file"
                  : undefined
              }
              className="rounded border border-border px-2.5 py-1.5 text-xs hover:bg-muted-bg disabled:opacity-50"
            >
              {isExportingCsv ? "Đang xuất..." : "⬇ CSV"}
            </button>
            <button
              disabled={!exportReady || isExportingPng || pendingCount > 0}
              onClick={onExportPng}
              title={
                pendingCount > 0
                  ? "Lưu hoặc huỷ các thay đổi đang chờ trước khi xuất file"
                  : undefined
              }
              className="rounded border border-border px-2.5 py-1.5 text-xs hover:bg-muted-bg disabled:opacity-50"
            >
              {isExportingPng ? "Đang xuất..." : "⬇ PNG"}
            </button>
          </>
        )}

        {scale !== undefined && (
          <div className="flex items-center gap-1">
            <button
              onClick={onZoomOut}
              className="rounded border border-border px-2.5 py-1.5 text-xs hover:bg-muted-bg"
            >
              −
            </button>
            <span className="w-12 text-center text-xs text-muted">{Math.round(scale * 100)}%</span>
            {onFitToView && (
              <button
                onClick={onFitToView}
                title="Canh toàn bộ vừa khung nhìn"
                className="rounded border border-border px-2.5 py-1.5 text-xs hover:bg-muted-bg"
              >
                Vừa khung
              </button>
            )}
            <button
              onClick={onZoomIn}
              className="rounded border border-border px-2.5 py-1.5 text-xs hover:bg-muted-bg"
            >
              +
            </button>
            <button
              onClick={onReset}
              className="ml-1 rounded border border-border px-2.5 py-1.5 text-xs hover:bg-muted-bg"
            >
              Reset
            </button>
          </div>
        )}
      </div>
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

/**
 * Giai đoạn 9 — Hiển thị ảnh nền Surface trong Surface View.
 *
 * Dùng <clipPath> để clip ảnh trong đúng bounding box Surface.
 * pointerEvents="none" để không chặn click chọn Display Position bên trên.
 * useId() đảm bảo clipPath id không trùng nhau khi có nhiều SVG trên trang.
 */
function SurfaceBackgroundImage({
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
  const uid = useId();
  const clipId = `surface-bg-clip-${uid.replace(/:/g, "")}`;

  const rect = positionScreenRect(
    { x: 0, y: 0, widthMm: surface.widthMm, heightMm: surface.heightMm },
    scale,
    panX,
    panY
  );

  const src = backgroundImageUrl(surface.backgroundImageId!);

  // Tính preserveAspectRatio theo backgroundFit.
  const preserveAspectRatio =
    surface.backgroundFit === "cover"
      ? "xMidYMid slice"
      : surface.backgroundFit === "stretch"
      ? "none"
      : "xMidYMid meet"; // contain (default)

  return (
    <g pointerEvents="none">
      <defs>
        <clipPath id={clipId}>
          <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} />
        </clipPath>
      </defs>
      <image
        href={src}
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        opacity={surface.backgroundOpacity}
        preserveAspectRatio={preserveAspectRatio}
        clipPath={`url(#${clipId})`}
      />
    </g>
  );
}

/**
 * Giai đoạn 8 C3: DisplayPositionShape nhận assignment từ Map ở cha (bỏ N+1).
 * Thêm render ảnh khi cellMode === "image".
 */
function DisplayPositionShape({
  position,
  geometry,
  scale,
  panX,
  panY,
  selected,
  editing,
  assignment,
  cellMode,
  fillOpacity = 1,
  strokeVisible = true,
  stampMode = false,
  pending,
  rejectReason,
  itemError,
  onSelect,
  onStamp,
  onDropProduct,
  dropDisabled = false,
  dropReplaces = false,
}: {
  position: DisplayPosition;
  geometry: PositionGeometry;
  scale: number;
  panX: number;
  panY: number;
  selected: boolean;
  editing: boolean;
  assignment?: AssignmentWithProduct;
  cellMode: SurfaceCellMode;
  /** < 1 để nhìn xuyên khung; 0 là tắt hẳn nền. */
  fillOpacity?: number;
  /** false = bỏ luôn viền ô (chế độ "Tắt", giống bản dựng trên Canva). */
  strokeVisible?: boolean;
  stampMode?: boolean;
  pending?: PendingAssignment;
  rejectReason?: StampRejectReason;
  itemError?: string;
  onSelect: () => void;
  onStamp?: () => void;
  onDropProduct?: (p: StampProductRef) => void;
  /** Ô không Active → không nhận thả. */
  dropDisabled?: boolean;
  /** Thả vào đây sẽ thay sản phẩm đang có — dùng để đổi màu gợi ý khi rê tới. */
  dropReplaces?: boolean;
}) {
  const rect = positionScreenRect(geometry, scale, panX, panY);
  const active = assignment ?? null;
  const [hovered, setHovered] = useState(false);

  // Cắt chữ trong đúng khung ô — trước đây description dài tràn sang ô bên cạnh,
  // trong khi bản PNG đã cắt gọn → màn hình và file xuất ra không khớp nhau.
  const uid = useId();
  const textClipId = `pos-text-clip-${uid.replace(/:/g, "")}`;

  // Phân biệt click thật với thao tác pan bắt đầu trên ô. Không có ngưỡng này
  // thì mỗi lần kéo canvas từ trên một ô sẽ vô tình dán sản phẩm vào đó.
  const downRef = useRef<{ x: number; y: number } | null>(null);

  // Ưu tiên: lỗi > pending > đã gán > trống.
  const errored = Boolean(rejectReason || itemError);
  const cellFill = errored
    ? REJECTED_FILL
    : pending
    ? PENDING_FILL
    : active
    ? OCCUPIED_FILL
    : EMPTY_FILL;
  const cellStroke = errored
    ? REJECTED_STROKE
    : pending
    ? PENDING_STROKE
    : active
    ? OCCUPIED_STROKE
    : EMPTY_STROKE;
  const cellText = errored
    ? REJECTED_TEXT
    : pending
    ? PENDING_TEXT
    : active
    ? OCCUPIED_TEXT
    : EMPTY_TEXT;

  // Khung mờ đi thì viền phải đậm lên, nếu không lưới ô sẽ tan vào ảnh nền.
  // Ô pending/lỗi luôn tô đặc để nổi bật, kể cả khi có ảnh nền.
  const translucent = fillOpacity < 1 && !pending && !errored;
  const baseStrokeWidth = translucent ? 2 : 1.25;
  const effectiveFillOpacity = pending || errored ? 1 : fillOpacity;
  // Ô đang chờ lưu / đang lỗi luôn phải thấy được, kể cả khi người dùng chọn
  // "Tắt" — nếu không thì thao tác gán hàng loạt mất hết phản hồi thị giác.
  const showStroke = strokeVisible || pending || errored || selected || editing;

  // Ô đã có hàng: dán được nhưng sẽ THAY THẾ sản phẩm cũ khi Lưu.
  const stampReplaces = stampMode && Boolean(active) && !pending;

  // Kéo-thả: chỉ sáng khi con trỏ đang mang đúng dữ liệu Product của app này.
  const [dragOver, setDragOver] = useState(false);
  const canDrop = Boolean(onDropProduct) && !dropDisabled;

  // Trạng thái ảnh cho chế độ "Ảnh" — useImageStatus trả "none" khi không có URL.
  const imageStatus = useImageStatus(
    cellMode === "image" ? active?.product.imageUrl : null
  );

  // Ô pending hiện nhãn sản phẩm sắp gán, không phải sản phẩm cũ.
  const showImage =
    cellMode === "image" && imageStatus === "ok" && active?.product.imageUrl && !pending;

  return (
    <g
      onPointerDown={(e) => {
        e.stopPropagation();
        downRef.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const down = downRef.current;
        downRef.current = null;
        // Di chuyển quá 4px = user đang pan, không phải bấm chọn ô.
        if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) return;
        if (stampMode) {
          // Trong chế độ dán, click KHÔNG đổi selection — Inspector giữ nguyên
          // panel review thay vì nhảy lung tung.
          onStamp?.();
          return;
        }
        onSelect();
      }}
      onPointerEnter={() => stampMode && setHovered(true)}
      onPointerLeave={() => stampMode && setHovered(false)}
      // Kéo-thả Product từ Product Library vào ô. Thả xong vẫn là ô "chờ lưu"
      // trong cùng Draft với gán hàng loạt — không ghi DB ngay (nguyên tắc #1).
      onDragOver={(e) => {
        if (!canDrop || !e.dataTransfer.types.includes(PRODUCT_DND_MIME)) return;
        e.preventDefault(); // bắt buộc, nếu không trình duyệt sẽ không cho thả
        e.dataTransfer.dropEffect = "copy";
        if (!dragOver) setDragOver(true);
      }}
      onDragLeave={() => dragOver && setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false);
        if (!canDrop) return;
        const raw = e.dataTransfer.getData(PRODUCT_DND_MIME);
        if (!raw) return;
        e.preventDefault();
        try {
          onDropProduct!(JSON.parse(raw) as StampProductRef);
        } catch {
          // Payload hỏng → bỏ qua, không làm gì cả.
        }
      }}
      className={stampMode ? "cursor-copy" : "cursor-pointer"}
    >
      {/* Tooltip. Quan trọng nhất khi ô quá hẹp để vẽ chữ (rect.width <= 30) —
          trước đây những ô đó không hiện gì, rê chuột cũng không biết có gì bên trong. */}
      <title>
        {stampMode
          ? stampReplaces
            ? `Đang có ${active!.product.itemCode} — bấm để THAY bằng sản phẩm đang chọn`
            : pending
            ? `${pending.itemCode}${pending.replacesExisting ? ` (thay ${pending.replacesItemCode})` : ""} — bấm lại để bỏ`
            : "Bấm để gán sản phẩm đang chọn"
          : [
              `${position.displayType} (${position.x}, ${position.y})`,
              `${position.widthMm} × ${position.heightMm} mm`,
              active
                ? `${active.product.itemCode} — ${active.product.description} (facing ${active.facingQty})`
                : "Chưa gán sản phẩm",
              position.capacity != null ? `Capacity: ${position.capacity}` : null,
              position.facingLimit != null ? `Facing limit: ${position.facingLimit}` : null,
            ]
              .filter(Boolean)
              .join("\n")}
      </title>
      <defs>
        <clipPath id={textClipId}>
          <rect
            x={rect.x + 3}
            y={rect.y}
            width={Math.max(0, rect.width - 6)}
            height={rect.height}
          />
        </clipPath>
      </defs>
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        fill={cellFill}
        fillOpacity={effectiveFillOpacity}
        stroke={showStroke ? cellStroke : "none"}
        strokeWidth={selected || pending || errored ? baseStrokeWidth + 1.25 : baseStrokeWidth}
        strokeDasharray={editing || pending ? "6 3" : undefined}
        rx={2}
      />

      {/* Đang rê sản phẩm lên ô này — tô nổi để biết sẽ thả vào đâu.
          Ô đã có hàng dùng nét đứt + nhãn "THAY", để user biết trước là thả vào
          đây sẽ đổi sản phẩm chứ không phải thêm mới. */}
      {dragOver && (
        <>
          <rect
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            fill={PENDING_FILL}
            fillOpacity={0.85}
            stroke={PENDING_STROKE}
            strokeWidth={3}
            strokeDasharray={dropReplaces ? "6 3" : undefined}
            rx={2}
          />
          {dropReplaces && rect.width > 34 && (
            <text
              x={rect.x + rect.width / 2}
              y={rect.y + rect.height / 2 + 3}
              fontSize={9}
              fontWeight={700}
              fill={PENDING_TEXT}
              textAnchor="middle"
              className="select-none"
            >
              THAY
            </text>
          )}
        </>
      )}

      {/* Viền ma khi rê chuột trong chế độ dán */}
      {stampMode && hovered && (
        <rect
          x={rect.x + 1.5}
          y={rect.y + 1.5}
          width={Math.max(0, rect.width - 3)}
          height={Math.max(0, rect.height - 3)}
          fill="none"
          stroke={PENDING_STROKE}
          strokeWidth={2}
          strokeOpacity={0.6}
          rx={2}
        />
      )}
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

      {/* Chế độ ảnh: hiện hình khi "ok", fallback về chữ khi không có ảnh */}
      {showImage ? (
        <>
          <image
            href={active!.product.imageUrl!}
            x={rect.x + 2}
            y={rect.y + 2}
            width={rect.width - 4}
            height={rect.height - 4}
            preserveAspectRatio="xMidYMid meet"
          />
          {/* Dải nền mờ + item_code ở đáy khi ô đủ cao */}
          {rect.height > 40 && (
            <>
              <rect
                x={rect.x}
                y={rect.y + rect.height - 18}
                width={rect.width}
                height={18}
                fill="rgba(255,255,255,0.85)"
              />
              <text
                x={rect.x + 4}
                y={rect.y + rect.height - 6}
                fontSize={8}
                fill={OCCUPIED_TEXT}
                className="select-none"
              >
                {active!.product.itemCode}
              </text>
            </>
          )}
        </>
      ) : (
        /* Chế độ chữ (hoặc fallback khi ảnh hỏng/chưa có) */
        <>
          {/* Có ảnh nền → khung mờ, chữ cần dải nền riêng mới đọc được trên ảnh
              kệ thật (cùng cách chế độ "Ảnh" đang làm ở dải item_code phía dưới). */}
          {translucent && rect.width > 30 && (
            <rect
              x={rect.x + 1}
              y={rect.y + 1}
              width={rect.width - 2}
              height={Math.min(rect.height - 2, active && rect.height > 26 ? 26 : 15)}
              fill="rgba(255,255,255,0.82)"
              rx={2}
            />
          )}
          {rect.width > 30 && (
            <text
              x={rect.x + 4}
              y={rect.y + 12}
              fontSize={9}
              fontWeight={active || pending ? 600 : 400}
              fill={cellText}
              clipPath={`url(#${textClipId})`}
              className="select-none"
            >
              {pending
                ? `${pending.itemCode} ×${pending.facingQty}`
                : active
                ? active.product.itemCode
                : position.displayType}
            </text>
          )}
          {(pending || active) && rect.width > 30 && rect.height > 26 && (
            <text
              x={rect.x + 4}
              y={rect.y + 23}
              fontSize={8}
              fill={cellText}
              clipPath={`url(#${textClipId})`}
              className="select-none"
            >
              {pending ? pending.description : active!.product.description}
            </text>
          )}
        </>
      )}

      {/* Nhãn trạng thái phía trên ô — Draft (đang sửa hình học) vs Chờ lưu (gán hàng loạt) */}
      {editing && (
        <text x={rect.x} y={rect.y - 4} fontSize={9} fill="#e85d04" fontWeight={600}>
          Draft
        </text>
      )}
      {!editing && pending && !errored && (
        <text x={rect.x} y={rect.y - 4} fontSize={9} fill={PENDING_STROKE} fontWeight={600}>
          {pending.replacesExisting ? `Thay ${pending.replacesItemCode}` : "Chờ lưu"}
        </text>
      )}
      {errored && (
        <text x={rect.x} y={rect.y - 4} fontSize={9} fill={REJECTED_STROKE} fontWeight={700}>
          ✕ {itemError ? "Lỗi" : ""}
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
