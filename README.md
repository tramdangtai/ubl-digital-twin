# Digital Twin Platform — Uncel Bills

Web app tái tạo không gian trưng bày trong cửa hàng bán lẻ dưới dạng dữ liệu: dựng lại từng kệ,
từng mặt kệ, từng vị trí treo, ghi nhận sản phẩm nào nằm ở đâu, rồi xuất ra ảnh PNG và bảng CSV để
gửi cho retailer.

```
Retailer → Store → Fixture → Surface → Display Position → Product Assignment → Product
```

**Người dùng cuối:** đọc [sổ tay hướng dẫn](docs/huong-dan-su-dung.html) — không cần biết gì về kỹ
thuật.

## Chạy tại máy

Cần Node.js 20+ và một project Supabase.

```bash
npm install
cp .env.example .env.local    # rồi điền giá trị thật
npm run dev                   # đợi dòng "✓ Ready"
```

Mở <http://localhost:3000>.

### Biến môi trường

| Biến | Dùng để |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key, dùng ở trình duyệt |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key, **chỉ dùng phía server** |
| `DATABASE_URL` | Chuỗi kết nối Postgres |

`DATABASE_URL` phải trỏ tới **transaction pooler** (port `6543`, kèm `?pgbouncer=true`), không phải
kết nối trực tiếp port 5432 — mỗi Route Handler trên Vercel là một serverless function riêng, dùng
kết nối trực tiếp sẽ cạn connection pool.

Không commit `.env.local`.

### Thiết lập một lần cho mỗi môi trường

```bash
npm run db:migrate                                # apply schema
npx tsx scripts/seed-admin.ts <email> [password]  # tạo Admin đầu tiên
npx tsx scripts/setup-storage.ts                  # tạo bucket ảnh nền
```

Cả ba script đều chạy lại được an toàn. Bỏ sót bước nào thì tính năng tương ứng sẽ lỗi khi dùng
thật, nên chạy đủ khi dựng môi trường mới.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Build production |
| `npm run lint` | ESLint |
| `npm run db:generate` | Sinh migration sau khi sửa `src/lib/db/schema.ts` |
| `npm run db:migrate` | Apply migration lên DB |

## Cấu trúc

```
src/
  app/
    api/            Route Handlers — lớp API
    digital-twin/   Màn hình chính (3 panel)
    backgrounds/    Quản lý ảnh nền (Admin)
    users/          Quản lý người dùng (Admin)
  components/digital-twin/
  lib/
    db/             Drizzle schema + client
    validation/     Zod schema theo entity
    services/       Business rule, transaction
    api/            Client, error taxonomy, response envelope, hooks
    state/          Zustand store
    rendering/      Hàm thuần chuyển mm → pixel
    export/         Sinh file PNG/CSV
    auth/           Session + guard
  middleware.ts     Chặn request chưa đăng nhập ở edge
drizzle/            Migration đã sinh
scripts/            Script vận hành chạy một lần
docs/               Tài liệu
```

Mọi mutation đi theo một đường: Route Handler → service → repository → Postgres. Trình duyệt không
gọi thẳng Supabase cho nghiệp vụ.

## Tài liệu

| File | Cho ai |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Decision log + nguyên tắc kiến trúc. Đọc trước khi sửa code. |
| [docs/huong-dan-su-dung.html](docs/huong-dan-su-dung.html) | Người dùng cuối |
| [docs/changelog.md](docs/changelog.md) | Lịch sử phát triển, bug đáng nhớ |
| [docs/spec/](docs/spec/) | Specification nghiệp vụ gốc |

## Triển khai

Vercel, tự động deploy theo nhánh `main`. Nhớ đặt `DATABASE_URL` trên Vercel là chuỗi pooler.

## Trạng thái

Phase 1 đã xong và đang chạy thật: dựng cấu trúc cửa hàng, thư viện sản phẩm, gán sản phẩm (ba
cách gồm kéo thả và gán hàng loạt), ảnh nền, xuất PNG/CSV, phân quyền ba vai trò.

Chưa có: import Excel, kéo Display Position trên canvas, undo toàn cục, khôi phục mục đã archive,
lưu lịch sử phiên bản planogram, test runner.
