# Changelog

Lịch sử phát triển theo giai đoạn. Quyết định còn hiệu lực nằm ở
[CLAUDE.md](../CLAUDE.md); file này ghi *đã giao được gì* và *học được gì*.

---

## Giai đoạn 11 — Kéo thả Product + nâng chất lượng UI/UX

Kéo sản phẩm từ Product Library thả thẳng vào ô trên canvas. Thả xong vào đúng Draft
của gán hàng loạt nên vẫn là ô chờ Lưu — tái dùng nguyên đường Save/Huỷ/undo, không
dựng luồng ghi thứ hai. MIME riêng `application/x-ubl-product` để text kéo từ nơi khác
không bị hiểu nhầm.

Audit UI/UX bằng cách dùng thật app, phát hiện **hai lỗi đang chạy ngầm**:

- **Lỗi API trông y hệt "chưa có dữ liệu".** `workspace.tsx` không đọc `isLoading`/
  `error` ở đâu cả, nên API 500 cho ra màn hình trống giống hệt lúc chưa có dữ liệu —
  và nút tạo biến mất luôn vì `/api/me` cũng lỗi mà `retry: false` làm mất quyền ghi
  vĩnh viễn cả phiên. Người dùng sẽ kết luận "mất sạch dữ liệu".
- **Wheel zoom chưa bao giờ chạy.** Effect gắn listener chạy một lần lúc mount, khi đó
  chưa chọn Store nên container chưa tồn tại; deps không đổi nên không gắn lại bao giờ.

Thêm: fit-to-view khi mở Surface, zoom bám con trỏ, tooltip cho mọi ô, Esc bỏ chọn,
cắt chữ gọn trong ô cho khớp bản PNG, `assignmentMap` bọc `useMemo`. Đổi `DATABASE_URL`
sang transaction pooler kèm `prepare: false`.

## Giai đoạn 10 — Gán hàng loạt

Gán 1 sản phẩm trước đây tốn 5 click + tìm kiếm + cuộn + 2 lần đổi tab; nhân với
400–4000 vị trí/store là khoảng 3200 thao tác. Rút còn **1 click/ô**: chọn sản phẩm,
bấm lần lượt các ô, Lưu một lần.

Tái dùng nguyên pattern của Bulk Generate thay vì nghĩ cách mới — Zustand draft giữ
nhiều pending, preview trên canvas, một transaction. `POST /api/product-assignments/bulk`
validate toàn bộ trước, có lỗi thì không ghi gì (all-or-nothing).

Sửa luôn lỗi khung Display Position tô đặc che kín ảnh nền, thêm dòng thống kê và số
thứ tự ô vào PNG, thêm cột `stt` vào CSV để hai file tra chéo được.

## Giai đoạn 9 — Ảnh nền Surface

Bucket Storage riêng tư + route proxy same-origin (để PNG export nhúng được ảnh mà
không vướng CORS). Upload chỉ Admin, có kiểm magic bytes. Client tự thu nhỏ ảnh trước
khi gửi vì Vercel chặn body ở 4.5 MB.

## Giai đoạn 8 — Ảnh sản phẩm + Export PNG/CSV

Thumbnail sản phẩm ở Explorer/Inspector/canvas. Bỏ N+1 (12 request → 1). Export PNG
(SVG → canvas → blob, ảnh phải chuyển `data:` URI trước nếu không canvas bị tainted) và
CSV (BOM + CRLF cho Excel tiếng Việt).

## Giai đoạn 7 — Deploy

Vercel, tự động theo nhánh `main`.

## Giai đoạn 6 — Auth & phân quyền

Supabase Auth, ba vai trò Admin/Editor/Viewer. Middleware lo xác thực ở edge, guard
trong từng Route Handler lo phân quyền. Trang `/users` cho Admin. Verify bằng cách gọi
API trực tiếp bỏ qua UI — Viewer vẫn bị 403.

## Giai đoạn 5 — Hoàn thiện vòng đời dữ liệu

Optimistic concurrency bằng so sánh `updated_at` cho cả 7 entity. Navigation guard cho
Draft dạng `useState` (4 panel). Badge "Unsaved changes".

## Giai đoạn 4 — Product Library + Assignment

Product có search + phân trang. Bảng assignment với partial unique index đảm bảo mỗi ô
chỉ có 1 assignment Active. Chốt: archive Product **không** cascade xuống assignment,
khác các entity trong cây hierarchy.

## Giai đoạn 3 — Surface View + Display Position

Surface View, Display Position, và Bulk Generate (sinh lưới N ô có preview trước khi
lưu).

**Bug đáng nhớ:** hàm cascade archive Surface lọc nhầm cột (`fixtureId` thay vì
`surfaceId`) nên archive đúng con nhưng chính nó vẫn Active. Type không bắt được vì cả
hai đều là string. Phát hiện nhờ query thẳng DB sau khi archive.

## Giai đoạn 2 — Fixture + Workspace 2D

Canvas SVG thật: grid, zoom, pan, drag-to-move, Draft/Save/Cancel. Rendering engine
(`coordinates.ts`). Tạo Fixture tự tạo kèm Surface "Front" trong cùng transaction.
Sửa lỗi layout Tài báo: panel giờ resizable + collapsible.

## Giai đoạn 1 — Nền móng

7 bảng đầy đủ constraint/trigger apply lên Supabase thật. Data layer, error taxonomy,
response envelope, API client. CRUD Retailer + Store nối UI 3 panel.

---

## Bài học lặp lại

**`tsc` + `lint` + `build` sạch không có nghĩa là chạy đúng.** Mọi bug lọt tới người
dùng trong dự án này đều qua được cả ba. Với logic có ghi DB thì phải query thẳng
database để đối chiếu; với UI thì phải bấm thật trên trình duyệt.

Đếm số bản ghi trước và sau là bằng chứng. "Có vẻ chạy được" thì không.
