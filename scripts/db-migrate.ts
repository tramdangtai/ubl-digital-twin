import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Thiếu DATABASE_URL trong .env.local");
}

async function main() {
  // max: 1 — migration cần connection đơn, không qua pooler transaction mode.
  const sql = postgres(connectionString!, { max: 1 });
  const db = drizzle(sql);

  console.log("Đang áp dụng migration lên:", connectionString!.replace(/:[^:@]+@/, ":***@"));
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migration hoàn tất.");

  await sql.end();
}

main().catch((err) => {
  console.error("Migration thất bại:", err);
  process.exit(1);
});
