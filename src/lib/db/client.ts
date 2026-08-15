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
 * Dùng Supabase **transaction pooler** (port 6543, `?pgbouncer=true`) theo đúng
 * CLAUDE.md mục "Ràng buộc kỹ thuật cần nhớ khi implement": mỗi Route Handler
 * trên Vercel là một serverless function riêng, mở direct connection per-request
 * sẽ cạn connection limit của Postgres khi có nhiều user đồng thời.
 *
 * `prepare: false` là BẮT BUỘC ở chế độ transaction pooling — pgbouncer không
 * giữ session giữa các transaction nên prepared statement sẽ lỗi
 * "prepared statement ... does not exist". Tự nhận diện theo connection string
 * để chạy được cả hai chế độ (direct khi dev tay, pooler khi deploy).
 */
const isPooled =
  connectionString.includes("pgbouncer=true") || connectionString.includes(":6543");

const globalForDb = globalThis as unknown as {
  __dbClient?: postgres.Sql;
};

const client =
  globalForDb.__dbClient ??
  postgres(connectionString, {
    // Pooler đã gộp connection ở tầng của nó — mỗi instance chỉ cần ít socket.
    max: isPooled ? 1 : 10,
    prepare: isPooled ? false : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__dbClient = client;
}

export const db = drizzle(client, { schema });
