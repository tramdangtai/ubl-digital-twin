# Digital Twin Platform — Uncel Bills

Web application tái tạo không gian trưng bày cửa hàng (Digital Twin) theo specification v0.2.

## Yêu cầu

- Node.js 20+
- npm hoặc pnpm
- Project Supabase: `Digital_Twin_Planogram`

## Cài đặt

```bash
npm install
cp .env.example .env.local   # nếu chưa có .env.local
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

## Biến môi trường

| Biến | Mô tả |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key (frontend) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (server only) |
| `DATABASE_URL` | PostgreSQL connection (migrations) |

**Không commit `.env.local`.**

## Cấu trúc thư mục (dự kiến)

```
src/
  app/              # Next.js App Router
  components/       # UI components
  lib/
    supabase/       # Supabase clients
    constants.ts    # Business enums
supabase/
  migrations/       # SQL schema (giai đoạn 2)
```

## Roadmap triển khai

1. ✅ Nền tảng dự án & môi trường
2. Database schema, RPC, RLS, seed
3. Auth & phân quyền admin/viewer
4. Layout 3 panel & routing
5. Retailer / Store CRUD
6. Fixture + Workspace 2D
7. Surface view & Display Position
8. Product Library & Assignment
9. Hoàn thiện Draft / Save / Archive UX

## Specification

Xem thư mục `Digital Twin Platform Specification/`.
