/**
 * Tạo Supabase Storage bucket cho ảnh nền Surface.
 * Idempotent — chạy lại nhiều lần không lỗi.
 * Chạy 1 lần/môi trường (dev và production riêng):
 *   npx tsx scripts/setup-storage.ts
 *
 * Bucket private + service-role key bypass RLS — đúng thiết kế E3.
 * KHÔNG tạo RLS policy nào; mọi truy cập đi qua route proxy /api/background-images/[id]/file.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { createAdminClient } = await import("../src/lib/supabase/admin");
  const { SURFACE_BACKGROUNDS_BUCKET } = await import("../src/lib/storage/constants");
  const supabase = createAdminClient();

  const { data: existing, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error("Không liệt kê được bucket:", listError.message);
    process.exit(1);
  }

  const alreadyExists = existing?.some((b) => b.name === SURFACE_BACKGROUNDS_BUCKET);

  if (alreadyExists) {
    console.log(`Bucket "${SURFACE_BACKGROUNDS_BUCKET}" đã tồn tại — bỏ qua.`);
    process.exit(0);
  }

  const { error } = await supabase.storage.createBucket(SURFACE_BACKGROUNDS_BUCKET, {
    public: false,
    fileSizeLimit: 4 * 1024 * 1024, // 4 MB — Vercel serverless body limit là 4.5 MB
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  });

  if (error) {
    // Bucket tồn tại rồi (race condition) — cũng OK.
    if (error.message.includes("already exists") || error.message.includes("Duplicate")) {
      console.log(`Bucket "${SURFACE_BACKGROUNDS_BUCKET}" đã tồn tại (concurrent) — bỏ qua.`);
      process.exit(0);
    }
    console.error("Tạo bucket thất bại:", error.message);
    process.exit(1);
  }

  console.log(`Đã tạo bucket "${SURFACE_BACKGROUNDS_BUCKET}" (private, 4MB limit).`);
  console.log("Không tạo RLS policy — toàn bộ truy cập đi qua route proxy /api/background-images/[id]/file.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
