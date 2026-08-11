import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Thiếu DATABASE_URL trong environment");
}

/**
 * Singleton qua globalThis — tránh tạo nhiều connection pool khi Next.js
 * hot-reload module trong development.
 *
 * TODO trước khi lên production/scale: đổi sang Supabase transaction pooler
 * (port 6543, `?pgbouncer=true`) thay vì direct connection — xem CLAUDE.md
 * mục "Ràng buộc kỹ thuật cần nhớ khi implement". Giai đoạn 1 dùng direct
 * connection vì tải thấp (Retailer/Store CRUD), chưa cần tối ưu sớm.
 */
const globalForDb = globalThis as unknown as {
  __dbClient?: postgres.Sql;
};

const client =
  globalForDb.__dbClient ??
  postgres(connectionString, {
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__dbClient = client;
}

export const db = drizzle(client, { schema });
