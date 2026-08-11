"use client";

import { ApiRequestError } from "@/lib/api/client";

export function FieldErrors({ error, field }: { error: unknown; field: string }) {
  if (!(error instanceof ApiRequestError)) return null;
  const msg = error.errors.find((e) => e.field === field)?.message;
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600">{msg}</p>;
}

export function GeneralError({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : "Đã xảy ra lỗi.";
  return <p className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{message}</p>;
}

export const inputClass =
  "w-full rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-ubl-primary";

export function NumberField({
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

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 flex items-center justify-between border-b border-border/60 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export function StatusBadge({ status }: { status: "Active" | "Archived" }) {
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
