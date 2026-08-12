"use client";

import Link from "next/link";

import { Explorer } from "@/components/digital-twin/explorer";
import { Inspector } from "@/components/digital-twin/inspector";
import { ResizeHandle } from "@/components/digital-twin/resize-handle";
import { Workspace } from "@/components/digital-twin/workspace";
import { useCurrentUser, useSignOut } from "@/lib/api/hooks/use-current-user";
import {
  EXPLORER_COLLAPSED_WIDTH,
  INSPECTOR_COLLAPSED_WIDTH,
  usePanelLayoutStore,
  WORKSPACE_MIN_WIDTH,
} from "@/lib/state/panel-layout";
import { useBeforeUnloadGuard } from "@/lib/state/unsaved-changes";

export default function DigitalTwinPage() {
  const {
    explorerWidth,
    inspectorWidth,
    explorerCollapsed,
    inspectorCollapsed,
    adjustExplorerWidth,
    adjustInspectorWidth,
    toggleExplorerCollapsed,
    toggleInspectorCollapsed,
  } = usePanelLayoutStore();
  useBeforeUnloadGuard();
  const { data: me } = useCurrentUser();
  const signOut = useSignOut();

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-12 shrink-0 items-center border-b border-border bg-card px-4">
        <span className="font-semibold text-ubl-secondary">Digital Twin</span>
        <span className="ml-2 text-xs text-muted">Uncel Bills</span>
        <div className="ml-auto flex items-center gap-3 text-xs">
          {me?.role === "Admin" && (
            <>
              <Link href="/users" className="text-ubl-primary hover:underline">
                Quản lý Người dùng
              </Link>
              <Link href="/backgrounds" className="text-ubl-primary hover:underline">
                Ảnh nền
              </Link>
            </>
          )}
          {me && (
            <span className="text-muted">
              {me.email} <span className="rounded bg-muted-bg px-1.5 py-0.5">{me.role}</span>
            </span>
          )}
          <button
            onClick={() => signOut()}
            className="rounded border border-border px-2 py-1 hover:bg-muted-bg"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* overflow-x-auto: nếu tổng độ rộng panel + min-width Workspace vượt viewport,
          cho scroll ngang thay vì để Workspace bị bóp mất. */}
      <div className="flex flex-1 overflow-x-auto overflow-y-hidden">
        <div
          style={{ width: explorerCollapsed ? EXPLORER_COLLAPSED_WIDTH : explorerWidth }}
          className="h-full shrink-0"
        >
          {explorerCollapsed ? (
            <CollapsedStrip label="Explorer" onExpand={toggleExplorerCollapsed} side="left" />
          ) : (
            <Explorer onCollapse={toggleExplorerCollapsed} />
          )}
        </div>
        {!explorerCollapsed && <ResizeHandle onDrag={adjustExplorerWidth} />}

        <div className="h-full flex-1" style={{ minWidth: WORKSPACE_MIN_WIDTH }}>
          <Workspace />
        </div>

        {!inspectorCollapsed && <ResizeHandle onDrag={adjustInspectorWidth} />}
        <div
          style={{ width: inspectorCollapsed ? INSPECTOR_COLLAPSED_WIDTH : inspectorWidth }}
          className="h-full shrink-0"
        >
          {inspectorCollapsed ? (
            <CollapsedStrip label="Inspector" onExpand={toggleInspectorCollapsed} side="right" />
          ) : (
            <Inspector onCollapse={toggleInspectorCollapsed} />
          )}
        </div>
      </div>
    </div>
  );
}

function CollapsedStrip({
  label,
  onExpand,
  side,
}: {
  label: string;
  onExpand: () => void;
  side: "left" | "right";
}) {
  return (
    <button
      onClick={onExpand}
      title={`Mở rộng ${label}`}
      className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-card text-muted hover:bg-muted-bg ${
        side === "left" ? "border-r border-border" : "border-l border-border"
      }`}
    >
      <span className="text-xs">{side === "left" ? "›" : "‹"}</span>
      <span
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ writingMode: "vertical-rl" }}
      >
        {label}
      </span>
    </button>
  );
}
