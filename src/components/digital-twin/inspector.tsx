"use client";

import { useEffect, useState } from "react";

import { ApiRequestError } from "@/lib/api/client";
import {
  useBulkGenerateDisplayPositions,
  useCreateDisplayPosition,
  useDisplayPositions,
  useUpdateDisplayPosition,
} from "@/lib/api/hooks/use-display-positions";
import { useCreateFixture, useFixtures, useUpdateFixture } from "@/lib/api/hooks/use-fixtures";
import { useCreateRetailer, useRetailers, useUpdateRetailer } from "@/lib/api/hooks/use-retailers";
import { useCreateStore, useStores, useUpdateStore } from "@/lib/api/hooks/use-stores";
import { useCreateSurface, useSurfaces, useUpdateSurface } from "@/lib/api/hooks/use-surfaces";
import { DISPLAY_TYPES, OWNER_COMPANIES, SURFACE_ORIENTATIONS } from "@/lib/constants";
import { useBulkGenerateDraftStore } from "@/lib/state/bulk-generate-draft";
import { useDisplayPositionDraftStore } from "@/lib/state/display-position-draft";
import { useFixtureDraftStore } from "@/lib/state/fixture-draft";
import { useSelectionStore } from "@/lib/state/selection";
import type {
  DisplayPosition,
  DisplayType,
  Fixture,
  OwnerCompany,
  Retailer,
  Store,
  Surface,
  SurfaceOrientation,
} from "@/lib/types/entities";

function FieldErrors({ error, field }: { error: unknown; field: string }) {
  if (!(error instanceof ApiRequestError)) return null;
  const msg = error.errors.find((e) => e.field === field)?.message;
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600">{msg}</p>;
}

function GeneralError({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : "Đã xảy ra lỗi.";
  return <p className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{message}</p>;
}

const inputClass =
  "w-full rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-ubl-primary";

function NumberField({
  label,
  value,
  onChange,
  error,
  field,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  error?: unknown;
  field: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <input
        type="number"
        className={inputClass}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
      />
      <FieldErrors error={error} field={field} />
    </label>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 flex items-center justify-between border-b border-border/60 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: "Active" | "Archived" }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
        status === "Active" ? "bg-green-100 text-green-700" : "bg-muted-bg text-muted"
      }`}
    >
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Create Retailer
// ---------------------------------------------------------------------------
function CreateRetailerPanel({ onCancel }: { onCancel: () => void }) {
  const [retailerCode, setRetailerCode] = useState("");
  const [retailerName, setRetailerName] = useState("");
  const { mutate, isPending, error, reset } = useCreateRetailer();
  const { selectRetailer } = useSelectionStore();

  return (
    <>
      <h3 className="mb-3 font-semibold text-ubl-secondary">Tạo Retailer mới</h3>
      <GeneralError error={error} />

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Retailer Code *</span>
        <input
          className={inputClass}
          value={retailerCode}
          onChange={(e) => {
            setRetailerCode(e.target.value);
            reset();
          }}
        />
        <FieldErrors error={error} field="retailerCode" />
      </label>

      <label className="mb-4 block">
        <span className="mb-1 block text-xs font-medium text-muted">Retailer Name *</span>
        <input
          className={inputClass}
          value={retailerName}
          onChange={(e) => {
            setRetailerName(e.target.value);
            reset();
          }}
        />
        <FieldErrors error={error} field="retailerName" />
      </label>

      <div className="flex gap-2">
        <button
          disabled={isPending || !retailerCode.trim() || !retailerName.trim()}
          onClick={() =>
            mutate(
              { retailerCode, retailerName },
              { onSuccess: (data) => selectRetailer(data.retailerId) }
            )
          }
          className="rounded bg-ubl-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-ubl-primary-dark disabled:opacity-50"
        >
          {isPending ? "Đang lưu..." : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted-bg"
        >
          Cancel
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Create Store
// ---------------------------------------------------------------------------
function CreateStorePanel({ retailerId, onCancel }: { retailerId: string; onCancel: () => void }) {
  const [storeCode, setStoreCode] = useState("");
  const [storeName, setStoreName] = useState("");
  const [address, setAddress] = useState("");
  const { mutate, isPending, error, reset } = useCreateStore();
  const { selectStore } = useSelectionStore();

  return (
    <>
      <h3 className="mb-3 font-semibold text-ubl-secondary">Tạo Store mới</h3>
      <GeneralError error={error} />

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Store Code *</span>
        <input
          className={inputClass}
          value={storeCode}
          onChange={(e) => {
            setStoreCode(e.target.value);
            reset();
          }}
        />
        <FieldErrors error={error} field="storeCode" />
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Store Name *</span>
        <input
          className={inputClass}
          value={storeName}
          onChange={(e) => {
            setStoreName(e.target.value);
            reset();
          }}
        />
        <FieldErrors error={error} field="storeName" />
      </label>

      <label className="mb-4 block">
        <span className="mb-1 block text-xs font-medium text-muted">Address</span>
        <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} />
      </label>

      <div className="flex gap-2">
        <button
          disabled={isPending || !storeCode.trim() || !storeName.trim()}
          onClick={() =>
            mutate(
              { retailerId, storeCode, storeName, address: address || undefined },
              { onSuccess: (data) => selectStore(retailerId, data.storeId) }
            )
          }
          className="rounded bg-ubl-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-ubl-primary-dark disabled:opacity-50"
        >
          {isPending ? "Đang lưu..." : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted-bg"
        >
          Cancel
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Create Fixture
// ---------------------------------------------------------------------------
function CreateFixturePanel({ storeId, onCancel }: { storeId: string; onCancel: () => void }) {
  const [fixtureCode, setFixtureCode] = useState("");
  const [fixtureName, setFixtureName] = useState("");
  const [ownerCompany, setOwnerCompany] = useState<OwnerCompany>("Uncel Bills");
  const [fixtureType, setFixtureType] = useState("");
  const [widthMm, setWidthMm] = useState("1800");
  const [heightMm, setHeightMm] = useState("2100");
  const [depthMm, setDepthMm] = useState("600");
  const [positionX, setPositionX] = useState("0");
  const [positionY, setPositionY] = useState("0");
  const { mutate, isPending, error, reset } = useCreateFixture();
  const { selectFixture } = useSelectionStore();

  const width = Number(widthMm);
  const height = Number(heightMm);
  const depth = Number(depthMm);
  const posX = Number(positionX);
  const posY = Number(positionY);
  const isValid =
    Number.isFinite(width) &&
    width > 0 &&
    Number.isFinite(height) &&
    height > 0 &&
    Number.isFinite(depth) &&
    depth > 0 &&
    Number.isFinite(posX) &&
    Number.isFinite(posY);

  return (
    <>
      <h3 className="mb-3 font-semibold text-ubl-secondary">Tạo Fixture mới</h3>
      <GeneralError error={error} />

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Fixture Code *</span>
        <input
          className={inputClass}
          value={fixtureCode}
          onChange={(e) => {
            setFixtureCode(e.target.value);
            reset();
          }}
        />
        <FieldErrors error={error} field="fixtureCode" />
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Fixture Name *</span>
        <input
          className={inputClass}
          value={fixtureName}
          onChange={(e) => {
            setFixtureName(e.target.value);
            reset();
          }}
        />
        <FieldErrors error={error} field="fixtureName" />
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Owner Company *</span>
        <select
          className={inputClass}
          value={ownerCompany}
          onChange={(e) => setOwnerCompany(e.target.value as OwnerCompany)}
        >
          {OWNER_COMPANIES.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Fixture Type</span>
        <input
          className={inputClass}
          value={fixtureType}
          onChange={(e) => setFixtureType(e.target.value)}
          placeholder="Gondola, Endcap, ..."
        />
      </label>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Width (mm) *</span>
          <input
            type="number"
            className={inputClass}
            value={widthMm}
            onChange={(e) => {
              setWidthMm(e.target.value);
              reset();
            }}
          />
          <FieldErrors error={error} field="widthMm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Height (mm) *</span>
          <input
            type="number"
            className={inputClass}
            value={heightMm}
            onChange={(e) => {
              setHeightMm(e.target.value);
              reset();
            }}
          />
          <FieldErrors error={error} field="heightMm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Depth (mm) *</span>
          <input
            type="number"
            className={inputClass}
            value={depthMm}
            onChange={(e) => {
              setDepthMm(e.target.value);
              reset();
            }}
          />
          <FieldErrors error={error} field="depthMm" />
        </label>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Position X (mm)</span>
          <input
            type="number"
            className={inputClass}
            value={positionX}
            onChange={(e) => setPositionX(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Position Y (mm)</span>
          <input
            type="number"
            className={inputClass}
            value={positionY}
            onChange={(e) => setPositionY(e.target.value)}
          />
        </label>
      </div>
      <p className="mb-4 text-xs text-muted">
        Surface “Front” sẽ được tự động tạo cùng Fixture (theo cùng kích thước mặt trước).
      </p>

      <div className="flex gap-2">
        <button
          disabled={isPending || !fixtureCode.trim() || !fixtureName.trim() || !isValid}
          onClick={() =>
            mutate(
              {
                storeId,
                fixtureCode,
                fixtureName,
                ownerCompany,
                fixtureType: fixtureType.trim() || undefined,
                widthMm: width,
                heightMm: height,
                depthMm: depth,
                positionX: posX,
                positionY: posY,
                rotationDegree: 0,
              },
              { onSuccess: (data) => selectFixture(data.fixtureId) }
            )
          }
          className="rounded bg-ubl-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-ubl-primary-dark disabled:opacity-50"
        >
          {isPending ? "Đang lưu..." : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted-bg"
        >
          Cancel
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Retailer Detail — Draft State pattern (Part 05 §5-6)
// ---------------------------------------------------------------------------
function RetailerDetailPanel({ retailer }: { retailer: Retailer }) {
  const [draft, setDraft] = useState({
    retailerCode: retailer.retailerCode,
    retailerName: retailer.retailerName,
  });
  const { mutate, isPending, error, reset } = useUpdateRetailer(retailer.retailerId);

  // Persisted state đổi (vd. sau khi Save thành công / chọn Retailer khác) → đồng bộ lại Draft.
  useEffect(() => {
    setDraft({ retailerCode: retailer.retailerCode, retailerName: retailer.retailerName });
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retailer.retailerId, retailer.retailerCode, retailer.retailerName]);

  const isDirty =
    draft.retailerCode !== retailer.retailerCode || draft.retailerName !== retailer.retailerName;

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-ubl-secondary">Retailer</h3>
        <StatusBadge status={retailer.status} />
      </div>
      <GeneralError error={error} />

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Retailer Code</span>
        <input
          className={inputClass}
          value={draft.retailerCode}
          disabled={retailer.status === "Archived"}
          onChange={(e) => setDraft((d) => ({ ...d, retailerCode: e.target.value }))}
        />
        <FieldErrors error={error} field="retailerCode" />
      </label>

      <label className="mb-4 block">
        <span className="mb-1 block text-xs font-medium text-muted">Retailer Name</span>
        <input
          className={inputClass}
          value={draft.retailerName}
          disabled={retailer.status === "Archived"}
          onChange={(e) => setDraft((d) => ({ ...d, retailerName: e.target.value }))}
        />
        <FieldErrors error={error} field="retailerName" />
      </label>

      {retailer.status === "Active" && (
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              disabled={!isDirty || isPending}
              onClick={() => mutate(draft)}
              className="rounded bg-ubl-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-ubl-primary-dark disabled:opacity-50"
            >
              {isPending ? "Đang lưu..." : "Save"}
            </button>
            {isDirty && (
              <button
                onClick={() =>
                  setDraft({ retailerCode: retailer.retailerCode, retailerName: retailer.retailerName })
                }
                className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted-bg"
              >
                Cancel
              </button>
            )}
          </div>
          <button
            onClick={() => {
              if (confirm("Archive Retailer này? Toàn bộ Store bên dưới cũng sẽ bị Archive.")) {
                mutate({ status: "Archived" });
              }
            }}
            className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            Archive
          </button>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Store Detail
// ---------------------------------------------------------------------------
function StoreDetailPanel({ store }: { store: Store }) {
  const [draft, setDraft] = useState({
    storeCode: store.storeCode,
    storeName: store.storeName,
    address: store.address ?? "",
  });
  const { mutate, isPending, error, reset } = useUpdateStore(store.storeId);

  useEffect(() => {
    setDraft({ storeCode: store.storeCode, storeName: store.storeName, address: store.address ?? "" });
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.storeId, store.storeCode, store.storeName, store.address]);

  const isDirty =
    draft.storeCode !== store.storeCode ||
    draft.storeName !== store.storeName ||
    draft.address !== (store.address ?? "");

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-ubl-secondary">Store</h3>
        <StatusBadge status={store.status} />
      </div>
      <GeneralError error={error} />

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Store Code</span>
        <input
          className={inputClass}
          value={draft.storeCode}
          disabled={store.status === "Archived"}
          onChange={(e) => setDraft((d) => ({ ...d, storeCode: e.target.value }))}
        />
        <FieldErrors error={error} field="storeCode" />
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Store Name</span>
        <input
          className={inputClass}
          value={draft.storeName}
          disabled={store.status === "Archived"}
          onChange={(e) => setDraft((d) => ({ ...d, storeName: e.target.value }))}
        />
        <FieldErrors error={error} field="storeName" />
      </label>

      <label className="mb-4 block">
        <span className="mb-1 block text-xs font-medium text-muted">Address</span>
        <input
          className={inputClass}
          value={draft.address}
          disabled={store.status === "Archived"}
          onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
        />
      </label>

      {store.status === "Active" && (
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              disabled={!isDirty || isPending}
              onClick={() => mutate(draft)}
              className="rounded bg-ubl-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-ubl-primary-dark disabled:opacity-50"
            >
              {isPending ? "Đang lưu..." : "Save"}
            </button>
            {isDirty && (
              <button
                onClick={() =>
                  setDraft({
                    storeCode: store.storeCode,
                    storeName: store.storeName,
                    address: store.address ?? "",
                  })
                }
                className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted-bg"
              >
                Cancel
              </button>
            )}
          </div>
          <button
            onClick={() => {
              if (confirm("Archive Store này? Toàn bộ Fixture/Surface/Position bên dưới cũng sẽ bị Archive.")) {
                mutate({ status: "Archived" });
              }
            }}
            className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            Archive
          </button>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Fixture Detail — dùng chung fixture-draft store với Workspace (Part 07 §4/§19:
// Draft ưu tiên hơn Persisted khi render, đồng bộ giữa Inspector và canvas).
// ---------------------------------------------------------------------------
function FixtureDetailPanel({ fixture, storeId }: { fixture: Fixture; storeId: string }) {
  const { editingFixtureId, draft, startEdit, updateDraft, cancelEdit, clearAfterSave } =
    useFixtureDraftStore();
  const isEditing = editingFixtureId === fixture.fixtureId;
  const { mutate, isPending, error, reset } = useUpdateFixture(fixture.fixtureId, storeId);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixture.fixtureId]);

  if (isEditing && draft) {
    const hasInvalidNumbers =
      !Number.isFinite(draft.widthMm) ||
      draft.widthMm <= 0 ||
      !Number.isFinite(draft.heightMm) ||
      draft.heightMm <= 0 ||
      !Number.isFinite(draft.depthMm) ||
      draft.depthMm <= 0 ||
      !Number.isFinite(draft.positionX) ||
      !Number.isFinite(draft.positionY) ||
      !Number.isFinite(draft.rotationDegree);

    return (
      <>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-ubl-secondary">Fixture</h3>
          <span className="rounded bg-ubl-primary/10 px-1.5 py-0.5 text-xs font-medium text-ubl-primary">
            Editing (Draft)
          </span>
        </div>
        <GeneralError error={error} />

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-muted">Fixture Code</span>
          <input
            className={inputClass}
            value={draft.fixtureCode}
            onChange={(e) => updateDraft({ fixtureCode: e.target.value })}
          />
          <FieldErrors error={error} field="fixtureCode" />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-muted">Fixture Name</span>
          <input
            className={inputClass}
            value={draft.fixtureName}
            onChange={(e) => updateDraft({ fixtureName: e.target.value })}
          />
          <FieldErrors error={error} field="fixtureName" />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-muted">Owner Company</span>
          <select
            className={inputClass}
            value={draft.ownerCompany}
            onChange={(e) => updateDraft({ ownerCompany: e.target.value as OwnerCompany })}
          >
            {OWNER_COMPANIES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-muted">Fixture Type</span>
          <input
            className={inputClass}
            value={draft.fixtureType}
            onChange={(e) => updateDraft({ fixtureType: e.target.value })}
          />
        </label>

        <div className="mb-3 grid grid-cols-3 gap-2">
          <NumberField
            label="Width (mm)"
            value={draft.widthMm}
            onChange={(v) => updateDraft({ widthMm: v })}
            error={error}
            field="widthMm"
          />
          <NumberField
            label="Height (mm)"
            value={draft.heightMm}
            onChange={(v) => updateDraft({ heightMm: v })}
            error={error}
            field="heightMm"
          />
          <NumberField
            label="Depth (mm)"
            value={draft.depthMm}
            onChange={(v) => updateDraft({ depthMm: v })}
            error={error}
            field="depthMm"
          />
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <NumberField
            label="Position X (mm)"
            value={draft.positionX}
            onChange={(v) => updateDraft({ positionX: v })}
            error={error}
            field="positionX"
          />
          <NumberField
            label="Position Y (mm)"
            value={draft.positionY}
            onChange={(v) => updateDraft({ positionY: v })}
            error={error}
            field="positionY"
          />
        </div>

        <label className="mb-1 block">
          <span className="mb-1 block text-xs font-medium text-muted">Rotation (độ)</span>
          <input
            type="number"
            className={inputClass}
            value={Number.isFinite(draft.rotationDegree) ? draft.rotationDegree : ""}
            onChange={(e) =>
              updateDraft({ rotationDegree: e.target.value === "" ? NaN : Number(e.target.value) })
            }
          />
        </label>
        <p className="mb-4 text-xs text-muted">
          Có thể kéo trực tiếp trên Workspace để đổi Position X/Y.
        </p>

        <div className="flex gap-2">
          <button
            disabled={isPending || hasInvalidNumbers}
            onClick={() =>
              mutate(
                { ...draft, fixtureType: draft.fixtureType.trim() || undefined },
                { onSuccess: () => clearAfterSave() }
              )
            }
            className="rounded bg-ubl-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-ubl-primary-dark disabled:opacity-50"
          >
            {isPending ? "Đang lưu..." : "Save"}
          </button>
          <button
            onClick={cancelEdit}
            className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted-bg"
          >
            Cancel
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-ubl-secondary">Fixture</h3>
        <StatusBadge status={fixture.status} />
      </div>

      <DetailRow label="Fixture Code" value={fixture.fixtureCode} />
      <DetailRow label="Fixture Name" value={fixture.fixtureName} />
      <DetailRow label="Owner Company" value={fixture.ownerCompany} />
      <DetailRow label="Fixture Type" value={fixture.fixtureType ?? "—"} />
      <DetailRow
        label="Width × Height × Depth (mm)"
        value={`${fixture.widthMm} × ${fixture.heightMm} × ${fixture.depthMm}`}
      />
      <DetailRow label="Position (X, Y) (mm)" value={`${fixture.positionX}, ${fixture.positionY}`} />
      <DetailRow label="Rotation" value={`${fixture.rotationDegree}°`} />

      {fixture.status === "Active" && (
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() =>
              startEdit(fixture.fixtureId, {
                fixtureCode: fixture.fixtureCode,
                fixtureName: fixture.fixtureName,
                ownerCompany: fixture.ownerCompany,
                fixtureType: fixture.fixtureType ?? "",
                widthMm: fixture.widthMm,
                heightMm: fixture.heightMm,
                depthMm: fixture.depthMm,
                positionX: fixture.positionX,
                positionY: fixture.positionY,
                rotationDegree: fixture.rotationDegree,
              })
            }
            className="rounded bg-ubl-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-ubl-primary-dark"
          >
            Edit
          </button>
          <button
            onClick={() => {
              if (
                confirm(
                  "Archive Fixture này? Toàn bộ Surface/Display Position bên dưới cũng sẽ bị Archive."
                )
              ) {
                mutate({ status: "Archived" });
              }
            }}
            className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            Archive
          </button>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Create Surface
// ---------------------------------------------------------------------------
function CreateSurfacePanel({ fixtureId, onCancel }: { fixtureId: string; onCancel: () => void }) {
  const [orientation, setOrientation] = useState<SurfaceOrientation>("Back");
  const [surfaceName, setSurfaceName] = useState("");
  const [widthMm, setWidthMm] = useState("1800");
  const [heightMm, setHeightMm] = useState("2100");
  const { mutate, isPending, error, reset } = useCreateSurface();
  const { selectSurface } = useSelectionStore();

  const width = Number(widthMm);
  const height = Number(heightMm);
  const isValid = Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0;

  return (
    <>
      <h3 className="mb-3 font-semibold text-ubl-secondary">Tạo Surface mới</h3>
      <GeneralError error={error} />

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Orientation *</span>
        <select
          className={inputClass}
          value={orientation}
          onChange={(e) => setOrientation(e.target.value as SurfaceOrientation)}
        >
          {SURFACE_ORIENTATIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <FieldErrors error={error} field="orientation" />
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Surface Name</span>
        <input
          className={inputClass}
          value={surfaceName}
          onChange={(e) => setSurfaceName(e.target.value)}
          placeholder={orientation}
        />
      </label>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Width (mm) *</span>
          <input
            type="number"
            className={inputClass}
            value={widthMm}
            onChange={(e) => {
              setWidthMm(e.target.value);
              reset();
            }}
          />
          <FieldErrors error={error} field="widthMm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Height (mm) *</span>
          <input
            type="number"
            className={inputClass}
            value={heightMm}
            onChange={(e) => {
              setHeightMm(e.target.value);
              reset();
            }}
          />
          <FieldErrors error={error} field="heightMm" />
        </label>
      </div>

      <div className="flex gap-2">
        <button
          disabled={isPending || !isValid}
          onClick={() =>
            mutate(
              {
                fixtureId,
                orientation,
                surfaceName: surfaceName.trim() || undefined,
                widthMm: width,
                heightMm: height,
              },
              { onSuccess: (data) => selectSurface(fixtureId, data.surfaceId) }
            )
          }
          className="rounded bg-ubl-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-ubl-primary-dark disabled:opacity-50"
        >
          {isPending ? "Đang lưu..." : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted-bg"
        >
          Cancel
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Surface Detail
// ---------------------------------------------------------------------------
function SurfaceDetailPanel({ surface, fixtureId }: { surface: Surface; fixtureId: string }) {
  const [draft, setDraft] = useState({
    surfaceName: surface.surfaceName ?? "",
    widthMm: surface.widthMm,
    heightMm: surface.heightMm,
  });
  const { mutate, isPending, error, reset } = useUpdateSurface(surface.surfaceId, fixtureId);

  useEffect(() => {
    setDraft({
      surfaceName: surface.surfaceName ?? "",
      widthMm: surface.widthMm,
      heightMm: surface.heightMm,
    });
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surface.surfaceId, surface.surfaceName, surface.widthMm, surface.heightMm]);

  const isDirty =
    draft.surfaceName !== (surface.surfaceName ?? "") ||
    draft.widthMm !== surface.widthMm ||
    draft.heightMm !== surface.heightMm;
  const hasInvalidNumbers =
    !Number.isFinite(draft.widthMm) || draft.widthMm <= 0 || !Number.isFinite(draft.heightMm) || draft.heightMm <= 0;

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-ubl-secondary">Surface</h3>
        <StatusBadge status={surface.status} />
      </div>
      <GeneralError error={error} />

      <DetailRow label="Orientation" value={surface.orientation} />

      <label className="mb-3 mt-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Surface Name</span>
        <input
          className={inputClass}
          value={draft.surfaceName}
          disabled={surface.status === "Archived"}
          onChange={(e) => setDraft((d) => ({ ...d, surfaceName: e.target.value }))}
        />
      </label>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <NumberField
          label="Width (mm)"
          value={draft.widthMm}
          onChange={(v) => setDraft((d) => ({ ...d, widthMm: v }))}
          error={error}
          field="widthMm"
        />
        <NumberField
          label="Height (mm)"
          value={draft.heightMm}
          onChange={(v) => setDraft((d) => ({ ...d, heightMm: v }))}
          error={error}
          field="heightMm"
        />
      </div>

      {surface.status === "Active" && (
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              disabled={!isDirty || isPending || hasInvalidNumbers}
              onClick={() => mutate(draft)}
              className="rounded bg-ubl-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-ubl-primary-dark disabled:opacity-50"
            >
              {isPending ? "Đang lưu..." : "Save"}
            </button>
            {isDirty && (
              <button
                onClick={() =>
                  setDraft({
                    surfaceName: surface.surfaceName ?? "",
                    widthMm: surface.widthMm,
                    heightMm: surface.heightMm,
                  })
                }
                className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted-bg"
              >
                Cancel
              </button>
            )}
          </div>
          <button
            onClick={() => {
              if (confirm("Archive Surface này? Toàn bộ Display Position bên dưới cũng sẽ bị Archive.")) {
                mutate({ status: "Archived" });
              }
            }}
            className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            Archive
          </button>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Create Display Position
// ---------------------------------------------------------------------------
function CreateDisplayPositionPanel({
  surfaceId,
  onCancel,
}: {
  surfaceId: string;
  onCancel: () => void;
}) {
  const [displayType, setDisplayType] = useState<DisplayType>("Shelf");
  const [x, setX] = useState("0");
  const [y, setY] = useState("0");
  const [widthMm, setWidthMm] = useState("300");
  const [heightMm, setHeightMm] = useState("300");
  const [capacity, setCapacity] = useState("");
  const [facingLimit, setFacingLimit] = useState("");
  const { mutate, isPending, error, reset } = useCreateDisplayPosition();
  const { selectDisplayPosition } = useSelectionStore();

  const xNum = Number(x);
  const yNum = Number(y);
  const width = Number(widthMm);
  const height = Number(heightMm);
  const isValid =
    Number.isFinite(xNum) &&
    Number.isFinite(yNum) &&
    Number.isFinite(width) &&
    width > 0 &&
    Number.isFinite(height) &&
    height > 0;

  return (
    <>
      <h3 className="mb-3 font-semibold text-ubl-secondary">Tạo Display Position mới</h3>
      <GeneralError error={error} />

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Display Type *</span>
        <select
          className={inputClass}
          value={displayType}
          onChange={(e) => setDisplayType(e.target.value as DisplayType)}
        >
          {DISPLAY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">X (mm)</span>
          <input type="number" className={inputClass} value={x} onChange={(e) => setX(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Y (mm)</span>
          <input type="number" className={inputClass} value={y} onChange={(e) => setY(e.target.value)} />
        </label>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Width (mm) *</span>
          <input
            type="number"
            className={inputClass}
            value={widthMm}
            onChange={(e) => {
              setWidthMm(e.target.value);
              reset();
            }}
          />
          <FieldErrors error={error} field="widthMm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Height (mm) *</span>
          <input
            type="number"
            className={inputClass}
            value={heightMm}
            onChange={(e) => {
              setHeightMm(e.target.value);
              reset();
            }}
          />
          <FieldErrors error={error} field="heightMm" />
        </label>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Capacity</span>
          <input
            type="number"
            className={inputClass}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
          <FieldErrors error={error} field="capacity" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Facing Limit</span>
          <input
            type="number"
            className={inputClass}
            value={facingLimit}
            onChange={(e) => setFacingLimit(e.target.value)}
          />
          <FieldErrors error={error} field="facingLimit" />
        </label>
      </div>

      <div className="flex gap-2">
        <button
          disabled={isPending || !isValid}
          onClick={() =>
            mutate(
              {
                surfaceId,
                displayType,
                x: xNum,
                y: yNum,
                widthMm: width,
                heightMm: height,
                capacity: capacity.trim() ? Number(capacity) : undefined,
                facingLimit: facingLimit.trim() ? Number(facingLimit) : undefined,
              },
              { onSuccess: (data) => selectDisplayPosition(surfaceId, data.positionId) }
            )
          }
          className="rounded bg-ubl-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-ubl-primary-dark disabled:opacity-50"
        >
          {isPending ? "Đang lưu..." : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted-bg"
        >
          Cancel
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Display Position Detail — dùng chung display-position-draft store với
// Workspace (đúng Draft Rendering Priority, Part 07 §4).
// ---------------------------------------------------------------------------
function DisplayPositionDetailPanel({
  position,
  surfaceId,
}: {
  position: DisplayPosition;
  surfaceId: string;
}) {
  const { editingPositionId, draft, startEdit, updateDraft, cancelEdit, clearAfterSave } =
    useDisplayPositionDraftStore();
  const isEditing = editingPositionId === position.positionId;
  const { mutate, isPending, error, reset } = useUpdateDisplayPosition(position.positionId, surfaceId);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.positionId]);

  if (isEditing && draft) {
    const hasInvalidNumbers =
      !Number.isFinite(draft.x) ||
      !Number.isFinite(draft.y) ||
      !Number.isFinite(draft.widthMm) ||
      draft.widthMm <= 0 ||
      !Number.isFinite(draft.heightMm) ||
      draft.heightMm <= 0;

    return (
      <>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-ubl-secondary">Display Position</h3>
          <span className="rounded bg-ubl-primary/10 px-1.5 py-0.5 text-xs font-medium text-ubl-primary">
            Editing (Draft)
          </span>
        </div>
        <GeneralError error={error} />

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-muted">Display Type</span>
          <select
            className={inputClass}
            value={draft.displayType}
            onChange={(e) => updateDraft({ displayType: e.target.value as DisplayType })}
          >
            {DISPLAY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <NumberField label="X (mm)" value={draft.x} onChange={(v) => updateDraft({ x: v })} error={error} field="x" />
          <NumberField label="Y (mm)" value={draft.y} onChange={(v) => updateDraft({ y: v })} error={error} field="y" />
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <NumberField
            label="Width (mm)"
            value={draft.widthMm}
            onChange={(v) => updateDraft({ widthMm: v })}
            error={error}
            field="widthMm"
          />
          <NumberField
            label="Height (mm)"
            value={draft.heightMm}
            onChange={(v) => updateDraft({ heightMm: v })}
            error={error}
            field="heightMm"
          />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <NumberField
            label="Capacity"
            value={draft.capacity ?? NaN}
            onChange={(v) => updateDraft({ capacity: Number.isFinite(v) ? v : null })}
            error={error}
            field="capacity"
          />
          <NumberField
            label="Facing Limit"
            value={draft.facingLimit ?? NaN}
            onChange={(v) => updateDraft({ facingLimit: Number.isFinite(v) ? v : null })}
            error={error}
            field="facingLimit"
          />
        </div>

        <div className="flex gap-2">
          <button
            disabled={isPending || hasInvalidNumbers}
            onClick={() => mutate(draft, { onSuccess: () => clearAfterSave() })}
            className="rounded bg-ubl-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-ubl-primary-dark disabled:opacity-50"
          >
            {isPending ? "Đang lưu..." : "Save"}
          </button>
          <button
            onClick={cancelEdit}
            className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted-bg"
          >
            Cancel
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-ubl-secondary">Display Position</h3>
        <StatusBadge status={position.status} />
      </div>

      <DetailRow label="Display Type" value={position.displayType} />
      <DetailRow label="Position (X, Y) (mm)" value={`${position.x}, ${position.y}`} />
      <DetailRow label="Width × Height (mm)" value={`${position.widthMm} × ${position.heightMm}`} />
      <DetailRow label="Capacity" value={position.capacity === null ? "—" : String(position.capacity)} />
      <DetailRow
        label="Facing Limit"
        value={position.facingLimit === null ? "—" : String(position.facingLimit)}
      />

      {position.status === "Active" && (
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() =>
              startEdit(position.positionId, {
                displayType: position.displayType,
                x: position.x,
                y: position.y,
                widthMm: position.widthMm,
                heightMm: position.heightMm,
                capacity: position.capacity,
                facingLimit: position.facingLimit,
              })
            }
            className="rounded bg-ubl-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-ubl-primary-dark"
          >
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm("Archive Display Position này? Product Assignment liên quan cũng sẽ bị Archive.")) {
                mutate({ status: "Archived" });
              }
            }}
            className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            Archive
          </button>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Bulk Generate Display Position — Draft dùng chung với Workspace để vẽ
// preview lưới trước khi Save (Part 04 §7.2).
// ---------------------------------------------------------------------------
function BulkGeneratePanel({ surfaceId, onCancel }: { surfaceId: string; onCancel: () => void }) {
  const [displayType, setDisplayType] = useState<DisplayType>("Shelf");
  const [rows, setRows] = useState("3");
  const [columns, setColumns] = useState("4");
  const [startX, setStartX] = useState("0");
  const [startY, setStartY] = useState("0");
  const [cellWidthMm, setCellWidthMm] = useState("300");
  const [cellHeightMm, setCellHeightMm] = useState("300");
  const [gapXMm, setGapXMm] = useState("10");
  const [gapYMm, setGapYMm] = useState("10");
  const [capacity, setCapacity] = useState("");
  const [facingLimit, setFacingLimit] = useState("");
  const { mutate, isPending, error, reset } = useBulkGenerateDisplayPositions();
  const { setDraft: setPreviewDraft, clearDraft: clearPreviewDraft } = useBulkGenerateDraftStore();
  const { cancelCreate } = useSelectionStore();

  const parsed = {
    rows: Number(rows),
    columns: Number(columns),
    startX: Number(startX),
    startY: Number(startY),
    cellWidthMm: Number(cellWidthMm),
    cellHeightMm: Number(cellHeightMm),
    gapXMm: Number(gapXMm),
    gapYMm: Number(gapYMm),
  };
  const isValid =
    Number.isInteger(parsed.rows) &&
    parsed.rows > 0 &&
    Number.isInteger(parsed.columns) &&
    parsed.columns > 0 &&
    Object.values(parsed).every((v) => Number.isFinite(v)) &&
    parsed.cellWidthMm > 0 &&
    parsed.cellHeightMm > 0 &&
    parsed.gapXMm >= 0 &&
    parsed.gapYMm >= 0;

  // Cập nhật preview trên Workspace mỗi khi form đổi (Draft, chưa Save).
  useEffect(() => {
    if (isValid) {
      setPreviewDraft(parsed);
    } else {
      clearPreviewDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columns, startX, startY, cellWidthMm, cellHeightMm, gapXMm, gapYMm]);

  useEffect(() => () => clearPreviewDraft(), [clearPreviewDraft]);

  const total = isValid ? parsed.rows * parsed.columns : 0;

  return (
    <>
      <h3 className="mb-3 font-semibold text-ubl-secondary">Bulk Generate Display Position</h3>
      <GeneralError error={error} />

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Display Type *</span>
        <select
          className={inputClass}
          value={displayType}
          onChange={(e) => setDisplayType(e.target.value as DisplayType)}
        >
          {DISPLAY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Rows *</span>
          <input type="number" className={inputClass} value={rows} onChange={(e) => setRows(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Columns *</span>
          <input
            type="number"
            className={inputClass}
            value={columns}
            onChange={(e) => setColumns(e.target.value)}
          />
        </label>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Start X (mm)</span>
          <input
            type="number"
            className={inputClass}
            value={startX}
            onChange={(e) => setStartX(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Start Y (mm)</span>
          <input
            type="number"
            className={inputClass}
            value={startY}
            onChange={(e) => setStartY(e.target.value)}
          />
        </label>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Cell Width (mm) *</span>
          <input
            type="number"
            className={inputClass}
            value={cellWidthMm}
            onChange={(e) => {
              setCellWidthMm(e.target.value);
              reset();
            }}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Cell Height (mm) *</span>
          <input
            type="number"
            className={inputClass}
            value={cellHeightMm}
            onChange={(e) => {
              setCellHeightMm(e.target.value);
              reset();
            }}
          />
        </label>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Gap X (mm)</span>
          <input
            type="number"
            className={inputClass}
            value={gapXMm}
            onChange={(e) => setGapXMm(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Gap Y (mm)</span>
          <input
            type="number"
            className={inputClass}
            value={gapYMm}
            onChange={(e) => setGapYMm(e.target.value)}
          />
        </label>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Capacity (áp dụng cho tất cả)</span>
          <input
            type="number"
            className={inputClass}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">
            Facing Limit (áp dụng cho tất cả)
          </span>
          <input
            type="number"
            className={inputClass}
            value={facingLimit}
            onChange={(e) => setFacingLimit(e.target.value)}
          />
        </label>
      </div>

      {isValid && (
        <p className="mb-4 rounded bg-ubl-primary/10 px-3 py-2 text-xs text-ubl-secondary">
          Sẽ tạo <strong>{total}</strong> Display Position — xem preview (viền chấm) trên Workspace.
        </p>
      )}
      {!isValid && <FieldErrors error={error} field="rows" />}

      <div className="flex gap-2">
        <button
          disabled={isPending || !isValid}
          onClick={() =>
            mutate(
              {
                surfaceId,
                displayType,
                ...parsed,
                capacity: capacity.trim() ? Number(capacity) : undefined,
                facingLimit: facingLimit.trim() ? Number(facingLimit) : undefined,
              },
              {
                onSuccess: () => {
                  clearPreviewDraft();
                  cancelCreate();
                },
              }
            )
          }
          className="rounded bg-ubl-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-ubl-primary-dark disabled:opacity-50"
        >
          {isPending ? "Đang tạo..." : `Tạo ${total || ""} Display Position`}
        </button>
        <button
          onClick={() => {
            clearPreviewDraft();
            onCancel();
          }}
          className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted-bg"
        >
          Cancel
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Root — header render 1 lần, body thay đổi theo selection/mode
// ---------------------------------------------------------------------------
export function Inspector({ onCollapse }: { onCollapse: () => void }) {
  const {
    mode,
    selectedRetailerId,
    selectedStoreId,
    selectedFixtureId,
    selectedSurfaceId,
    selectedDisplayPositionId,
    cancelCreate,
  } = useSelectionStore();
  const { data: retailers } = useRetailers();
  const { data: stores } = useStores();
  const { data: fixtures } = useFixtures(selectedStoreId ?? undefined);
  const { data: surfaces } = useSurfaces(selectedFixtureId ?? undefined);
  const { data: positions } = useDisplayPositions(selectedSurfaceId ?? undefined);

  let body: React.ReactNode;

  if (mode === "create-retailer") {
    body = <CreateRetailerPanel onCancel={cancelCreate} />;
  } else if (mode === "create-store" && selectedRetailerId) {
    body = <CreateStorePanel retailerId={selectedRetailerId} onCancel={cancelCreate} />;
  } else if (mode === "create-fixture" && selectedStoreId) {
    body = <CreateFixturePanel storeId={selectedStoreId} onCancel={cancelCreate} />;
  } else if (mode === "create-surface" && selectedFixtureId) {
    body = <CreateSurfacePanel fixtureId={selectedFixtureId} onCancel={cancelCreate} />;
  } else if (mode === "create-display-position" && selectedSurfaceId) {
    body = <CreateDisplayPositionPanel surfaceId={selectedSurfaceId} onCancel={cancelCreate} />;
  } else if (mode === "bulk-generate-display-position" && selectedSurfaceId) {
    body = <BulkGeneratePanel surfaceId={selectedSurfaceId} onCancel={cancelCreate} />;
  } else if (selectedDisplayPositionId && selectedSurfaceId) {
    const position = positions?.find((p) => p.positionId === selectedDisplayPositionId);
    body = position ? (
      <DisplayPositionDetailPanel position={position} surfaceId={selectedSurfaceId} />
    ) : (
      <p>Đang tải Display Position...</p>
    );
  } else if (selectedSurfaceId && selectedFixtureId) {
    const surface = surfaces?.find((s) => s.surfaceId === selectedSurfaceId);
    body = surface ? (
      <SurfaceDetailPanel surface={surface} fixtureId={selectedFixtureId} />
    ) : (
      <p>Đang tải Surface...</p>
    );
  } else if (selectedFixtureId && selectedStoreId) {
    const fixture = fixtures?.find((f) => f.fixtureId === selectedFixtureId);
    body = fixture ? (
      <FixtureDetailPanel fixture={fixture} storeId={selectedStoreId} />
    ) : (
      <p>Đang tải Fixture...</p>
    );
  } else if (selectedStoreId) {
    const store = stores?.find((s) => s.storeId === selectedStoreId);
    body = store ? <StoreDetailPanel store={store} /> : <p>Đang tải Store...</p>;
  } else if (selectedRetailerId) {
    const retailer = retailers?.find((r) => r.retailerId === selectedRetailerId);
    body = retailer ? <RetailerDetailPanel retailer={retailer} /> : <p>Đang tải Retailer...</p>;
  } else {
    body = (
      <p className="text-muted">
        Chọn một Retailer hoặc Store ở Explorer để xem chi tiết, hoặc tạo mới.
      </p>
    );
  }

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Inspector</span>
        <button
          onClick={onCollapse}
          title="Thu gọn Inspector"
          className="rounded px-1 text-muted hover:bg-muted-bg hover:text-foreground"
        >
          ›
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-sm">{body}</div>
    </div>
  );
}
