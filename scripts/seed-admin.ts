/**
 * Tạo user Admin đầu tiên — chạy 1 lần khi mới bổ sung Auth (Giai đoạn 6) vì
 * lúc đó chưa có Admin nào để tự tạo qua trang /users (chicken-and-egg).
 *
 * Cách chạy:
 *   npx tsx scripts/seed-admin.ts <email> [password]
 * Nếu không truyền password, script tự sinh 1 mật khẩu ngẫu nhiên và in ra.
 */
import { randomBytes } from "crypto";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const email = process.argv[2];
  const password = process.argv[3] ?? randomBytes(9).toString("base64url");

  if (!email) {
    console.error("Cách dùng: npx tsx scripts/seed-admin.ts <email> [password]");
    process.exit(1);
  }

  const { createAdminClient } = await import("../src/lib/supabase/admin");
  const { db } = await import("../src/lib/db/client");
  const { userProfile } = await import("../src/lib/db/schema");

  const adminClient = createAdminClient();

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    console.error("Tạo Auth user thất bại:", error?.message);
    process.exit(1);
  }

  await db.insert(userProfile).values({
    userId: data.user.id,
    email,
    role: "Admin",
  });

  console.log("Đã tạo Admin:");
  console.log("  Email:", email);
  console.log("  Mật khẩu:", password);
  console.log("(Đổi mật khẩu sau khi đăng nhập lần đầu nếu cần.)");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed thất bại:", err);
  process.exit(1);
});
