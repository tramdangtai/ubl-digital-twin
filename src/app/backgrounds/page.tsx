"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { GeneralError, StatusBadge } from "@/components/digital-twin/inspector-shared";
import { useCurrentUser } from "@/lib/api/hooks/use-current-user";
import {
  backgroundImageUrl,
  useBackgroundImages,
  useUpdateBackgroundImage,
  useUploadBackgroundImage,
} from "@/lib/api/hooks/use-background-images";
import { ALLOWED_MIME, MAX_UPLOAD_BYTES } from "@/lib/validation/background-image";
import { resizeImageForUpload } from "@/lib/images/resize";
import type { BackgroundImage } from "@/lib/types/entities";

export default function BackgroundsPage() {
  const { data: me, isLoading } = useCurrentUser();

  if (isLoading) return null;

  if (me?.role !== "Admin") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-muted">Bạn không có quyền truy cập trang này (chỉ Admin).</p>
        <Link href="/digital-twin" className="text-ubl-primary hover:underline">
          ← Quay lại Digital Twin
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ubl-secondary">Quản lý Ảnh nền Surface</h1>
          <p className="text-sm text-muted">Upload ảnh PNG/JPEG/WEBP (tối đa 4 MB sau resize)</p>
        </div>
        <Link href="/digital-twin" className="text-sm text-ubl-primary hover:underline">
          ← Digital Twin
        </Link>
      </div>

      <UploadForm />
      <ImageGrid />
    </main>
  );
}

function UploadForm() {
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [resizing, setResizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate, isPending, error, reset } = useUploadBackgroundImage();

  const isValid = label.trim().length > 0 && file != null && !resizing;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;

    // Preview tạm (URL trước khi resize).
    const tempUrl = URL.createObjectURL(picked);
    setPreview(tempUrl);

    // Kiểm size trước khi resize — nếu đã nhỏ (<= 4MB) thì skip.
    if (picked.size > MAX_UPLOAD_BYTES) {
      setResizing(true);
      try {
        const { file: resized } = await resizeImageForUpload(picked);
        setFile(resized);
        // Cập nhật preview từ file đã resize (JPEG).
        const resizedUrl = URL.createObjectURL(resized);
        URL.revokeObjectURL(tempUrl);
        setPreview(resizedUrl);
      } catch {
        setFile(picked); // Fallback về file gốc nếu resize lỗi.
      } finally {
        setResizing(false);
      }
    } else {
      setFile(picked);
    }
    reset();
  }

  function handleSubmit() {
    if (!file || !label.trim()) return;
    reset();

    mutate(
      { file, label: label.trim() },
      {
        onSuccess: () => {
          setLabel("");
          setFile(null);
          if (preview) URL.revokeObjectURL(preview);
          setPreview(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
      }
    );
  }

  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 font-semibold text-ubl-secondary">+ Upload Ảnh nền</h2>
      <GeneralError error={error} />

      <div className="mb-3 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Chọn file (PNG / JPEG / WEBP) *
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_MIME.join(",")}
            onChange={handleFileChange}
            className="block w-full text-sm text-muted file:mr-3 file:cursor-pointer file:rounded file:border file:border-border file:bg-background file:px-2 file:py-1 file:text-xs"
          />
          {resizing && (
            <p className="mt-1 text-xs text-ubl-primary">Đang resize ảnh về ≤ 2560px...</p>
          )}
          {file && !resizing && (
            <p className="mt-1 text-xs text-muted">
              {file.name} ({(file.size / 1024).toFixed(0)} KB)
            </p>
          )}
        </div>

        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="preview"
            className="h-32 w-full rounded border border-border object-contain"
          />
        )}
      </div>

      <label className="mb-4 block">
        <span className="mb-1 block text-xs font-medium text-muted">Label (tên nhận dạng) *</span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-ubl-primary"
          placeholder="VD: Winmart Shelf Background 2026"
          value={label}
          onChange={(e) => { setLabel(e.target.value); reset(); }}
        />
      </label>

      <button
        disabled={!isValid || isPending}
        onClick={handleSubmit}
        className="rounded bg-ubl-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-ubl-primary-dark disabled:opacity-50"
      >
        {isPending ? "Đang upload..." : "Upload"}
      </button>
    </div>
  );
}

function ImageGrid() {
  const { data: images, isLoading } = useBackgroundImages(true);

  if (isLoading) return <p className="text-sm text-muted">Đang tải...</p>;
  if (!images || images.length === 0) {
    return <p className="text-sm text-muted">Chưa có ảnh nền nào. Hãy upload ảnh đầu tiên.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {images.map((img) => (
        <ImageCard key={img.backgroundImageId} image={img} />
      ))}
    </div>
  );
}

function ImageCard({ image }: { image: BackgroundImage }) {
  const { mutate, isPending, error } = useUpdateBackgroundImage(image.backgroundImageId);
  const src = backgroundImageUrl(image.backgroundImageId);

  return (
    <div
      className={`rounded-lg border bg-card p-3 ${
        image.status === "Archived" ? "border-border/50 opacity-60" : "border-border"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={image.label}
        className="mb-2 h-36 w-full rounded border border-border/50 object-contain bg-muted-bg"
      />
      <p className="mb-1 truncate text-sm font-medium text-ubl-secondary" title={image.label}>
        {image.label}
      </p>
      <p className="mb-2 text-xs text-muted">
        {image.mimeType.replace("image/", "").toUpperCase()} ·{" "}
        {(image.fileSizeBytes / 1024).toFixed(0)} KB
        {image.widthPx && image.heightPx ? ` · ${image.widthPx}×${image.heightPx}px` : ""}
      </p>
      <div className="flex items-center justify-between">
        <StatusBadge status={image.status} />
        <GeneralError error={error} />
        {image.status === "Active" ? (
          <button
            disabled={isPending}
            onClick={() => {
              if (confirm(`Archive ảnh "${image.label}"? Các Surface đang dùng ảnh này sẽ không còn hiện ảnh nền.`)) {
                mutate({ status: "Archived", expectedUpdatedAt: image.updatedAt });
              }
            }}
            className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Archive
          </button>
        ) : (
          <button
            disabled={isPending}
            onClick={() => mutate({ status: "Active", expectedUpdatedAt: image.updatedAt })}
            className="rounded border border-green-200 px-2 py-0.5 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50"
          >
            Restore
          </button>
        )}
      </div>
    </div>
  );
}
