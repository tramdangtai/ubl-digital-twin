"use client";

import { useEffect, useState } from "react";

import { ApiRequestError } from "@/lib/api/client";
import { useCreateFixture, useFixtures, useUpdateFixture } from "@/lib/api/hooks/use-fixtures";
import { useCreateRetailer, useRetailers, useUpdateRetailer } from "@/lib/api/hooks/use-retailers";
import { useCreateStore, useStores, useUpdateStore } from "@/lib/api/hooks/use-stores";
import { OWNER_COMPANIES } from "@/lib/constants";
import { useFixtureDraftStore } from "@/lib/state/fixture-draft";
import { useSelectionStore } from "@/lib/state/selection";
import type { Fixture, OwnerCompany, Retailer, Store } from "@/lib/types/entities";

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
// Root — header render 1 lần, body thay đổi theo selection/mode
// ---------------------------------------------------------------------------
export function Inspector({ onCollapse }: { onCollapse: () => void }) {
  const { mode, selectedRetailerId, selectedStoreId, selectedFixtureId, cancelCreate } =
    useSelectionStore();
  const { data: retailers } = useRetailers();
  const { data: stores } = useStores();
  const { data: fixtures } = useFixtures(selectedStoreId ?? undefined);

  let body: React.ReactNode;

  if (mode === "create-retailer") {
    body = <CreateRetailerPanel onCancel={cancelCreate} />;
  } else if (mode === "create-store" && selectedRetailerId) {
    body = <CreateStorePanel retailerId={selectedRetailerId} onCancel={cancelCreate} />;
  } else if (mode === "create-fixture" && selectedStoreId) {
    body = <CreateFixturePanel storeId={selectedStoreId} onCancel={cancelCreate} />;
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
