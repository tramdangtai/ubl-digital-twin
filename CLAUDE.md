# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc với repo này.

## Dự án là gì

Digital Twin Platform cho Uncel Bills (UBL) — nhà cung cấp hàng hóa cho chuỗi bán lẻ. UBL sở hữu
fixture trưng bày đặt trong store của retailer, trước đây quản lý planogram thủ công.

App tái tạo cấu trúc vật lý của từng cửa hàng dưới dạng dữ liệu, ghi nhận sản phẩm nào nằm ở vị trí
nào, rồi xuất ra PNG + CSV gửi cho retailer.

```
Retailer → Store → Fixture → Surface → Display Position → Product Assignment → Product
```

Product nằm **ngoài** cây phân cấp — một mặt hàng bày ở nhiều kệ.

**Con số chi phối mọi quyết định:** một store có **400–4000 Display Position**. Vì vậy công cụ nhập
liệu hàng loạt không phải tính năng phụ, nó là sản phẩm.

## Nguồn sự thật

```
Quyết định của Tài (business owner, trực tiếp trong chat)   ← khi mâu thuẫn, cái này thắng
        ↓
CLAUDE.md (file này) — decision log đã chốt
        ↓
docs/spec/ — specification nghiệp vụ gốc (Part 01–09)
        ↓
Implementation (code)
```

`docs/spec/` vẫn đúng cho **nghiệp vụ**, trừ những chỗ file này ghi đè. Bản technical design cũ
(mô tả stack Vite + FastAPI) đã bị bỏ ở Giai đoạn 11 vì không còn phản ánh thực tế — tìm trong git
history nếu cần.

## Stack

Full-stack **Next.js 15 App Router** — không tách frontend/backend riêng. Lý do: một type system,
không phải duplicate schema qua ranh giới ngôn ngữ, một deploy target. Route Handlers
(`src/app/api/**/route.ts`) đóng vai trò lớp API mà spec mô tả.

| Lớp | Công nghệ |
|---|---|
| Data | Drizzle ORM + `postgres` driver, Supabase Postgres |
| Auth | Supabase Auth + middleware + guard per-route |
| Server state | TanStack Query |
| UI/Draft state | Zustand |
| Canvas | SVG |
| Styling | Tailwind |

Browser **không bao giờ** gọi Supabase trực tiếp cho mutation nghiệp vụ. Mọi ghi đi qua
Route Handler → service → repository → Postgres.

### Hai ràng buộc kỹ thuật hay quên

- **Mọi cột `numeric` phải khai `{ mode: "number" }`.** Thiếu thì Drizzle trả string và mọi phép
  tính toạ độ vỡ âm thầm (`"100" + 50` = `"10050"`).
- **Kết nối phải qua transaction pooler** (port 6543, `?pgbouncer=true`) kèm **`prepare: false`**.
  Route Handler trên Vercel là serverless function; direct connection sẽ cạn pool. pgbouncer
  transaction mode không giữ session nên prepared statement sẽ lỗi. `db/client.ts` tự nhận diện.

## Nguyên tắc kiến trúc — không được phá

1. **Draft vs Persisted.** Mọi thay đổi sống ở frontend state cho tới khi user bấm Save. Không ghi
   DB theo từng pixel/keystroke. Đây là thứ khiến nhập liệu hàng loạt và undo khả thi.
2. **Database là source of truth** sau khi persist thành công. Không hard-code business data trong
   React.
3. **Lưu đơn vị vật lý (mm), không lưu đơn vị hiển thị.** Zoom/pan/scroll không bao giờ vào DB.
4. **Không hard delete.** Mọi entity dùng `status` Active/Archived, archive parent cascade xuống
   subtree trong một transaction ở service layer.
5. **Frontend không quyết business rule.** Có thể disable nút cho đỡ hiểu nhầm, nhưng backend luôn
   validate lại toàn bộ. Kiểm bằng cách gọi API bỏ qua UI.
6. **Rendering engine là hàm thuần.** Business data → visual. Không ghi DB, không quyết rule.
7. **Selection ≠ Assignment.** Click chọn chỉ đổi UI state; record chỉ tạo khi user xác nhận.
8. **Không báo "Saved" trước khi server xác nhận.** Không optimistic update cho thao tác ghi.

## Quyết định nghiệp vụ đã chốt

Coi đây là spec, không phải gợi ý.

**Phân quyền** — Viewer chỉ xem + xuất file; Editor full CRUD trên dữ liệu; Admin thêm quản lý user
và upload ảnh nền. Không self-signup, Admin tạo tài khoản.

**Hệ toạ độ**
- *Store space*: origin góc trên-trái mặt bằng, X sang phải, **Y hướng xuống** (khớp SVG, tránh lật
  trục). `fixture.position_x/y` = góc trên-trái bounding box **trước khi xoay**; `rotation_degree`
  xoay thuận chiều kim đồng hồ quanh **tâm**.
- *Surface space*: origin góc trên-trái khi nhìn trực diện, Y hướng xuống → `y = 0` là tầng trên
  cùng. Display Position luôn axis-aligned, không có rotation.
- **Workspace cấp Store là floor plan nhìn từ trên xuống** → bounding box Fixture là
  `width × depth`, KHÔNG phải `width × height`. Height chỉ có nghĩa ở Surface View.

**Uniqueness** — `retailer_code`, `store_code`, `fixture_code`, `item_code` unique **toàn hệ thống**,
không chỉ trong scope parent.

**Archive cascade** — archive parent thì cascade toàn bộ subtree (`src/lib/services/cascade.ts`).
Không cho tạo Active child dưới Archived parent (`422 PARENT_NOT_ACTIVE`).
**Ngoại lệ:** archive Product **không** cascade xuống Assignment — Product nằm ngoài cây hierarchy,
archive chỉ chặn gán mới, không đụng lịch sử.

**Capacity / Facing**
- `capacity` nullable, `>= 0` — sức chứa vật lý.
- `facing_limit` nullable, `>= 1` — giới hạn merchandising, khác capacity.
- `facing_qty` NOT NULL `>= 1` (refine từ spec gốc `>= 0`; muốn gỡ hàng thì archive assignment).
- `facing_qty <= facing_limit` enforce ở **service layer** (cross-table, DB CHECK không làm được).
- `capacity` vs tổng `facing_qty`: chưa enforce, cần dữ liệu kích thước sản phẩm tốt hơn.

**Concurrency** — optimistic bằng so sánh `updated_at`, không cần cột `version`. Client gửi kèm
`expectedUpdatedAt`, khác → `409 STALE_UPDATE`.

**Quy mô** — ~20 Retailer, ~100 Store, ~4000 SKU. Offset pagination là đủ.

**Fixture mới tự tạo kèm 1 Surface "Front"** trong cùng transaction. Các mặt khác tạo thủ công.

**Product có `width_mm/height_mm/depth_mm`** (thêm so với spec gốc) — cần cho capacity thật và
analytics sau này; thêm sớm rẻ hơn nhiều so với migrate sau.

**Không lưu kích thước mặt bằng store.** Canvas tự giãn theo bounding box các Fixture.

**Planogram versioning** — xác nhận là cần, nhưng chưa thiết kế. Nền tảng hiện tại (status trên mọi
entity + `start_date/end_date` trên assignment) đã tương thích. Không tự ý thiết kế bảng snapshot
khi chưa có yêu cầu cụ thể.

### Kéo sớm vào Phase 1

Vì khối lượng nhập liệu quá lớn, ba thứ vốn thuộc Phase 2 đã được duyệt làm sớm:

- **Bulk-generate Display Position** — sinh lưới N ô một lần.
- **Gán hàng loạt Product** (Giai đoạn 10) — chọn 1 sản phẩm rồi bấm lần lượt các ô.
- **Kéo thả Product** (Giai đoạn 11) — kéo từ Product Library thả vào ô.

Cả ba vẫn đúng Draft → Save → transaction, chỉ là Draft chứa nhiều object thay vì một.

Snap/Alignment/Version History/Undo-Redo toàn cục vẫn để Phase 2. Undo trong phiên gán (bấm lại ô
để gỡ) là hệ quả tự nhiên của Draft, không phải Undo-Redo toàn cục.

## Commands

```bash
npm install
npm run dev          # đợi dòng "✓ Ready" rồi mới test
npm run build
npm run lint
npm run db:generate  # sửa src/lib/db/schema.ts xong thì chạy để sinh migration
npm run db:migrate   # apply migration lên DB trỏ bởi DATABASE_URL
npx tsx scripts/seed-admin.ts <email> [password]   # tạo Admin đầu tiên, 1 lần/môi trường
npx tsx scripts/setup-storage.ts                   # tạo bucket ảnh nền, 1 lần/môi trường
```

Chưa có test runner. Thêm khi có code cần test, không thêm trước.

## Chuẩn kiểm chứng

**`tsc` + `lint` + `build` sạch KHÔNG có nghĩa là chạy đúng.** Mọi bug lọt tới người dùng trong dự
án này đều qua được cả ba — xem [docs/changelog.md](docs/changelog.md).

Trước khi coi một việc là xong:

- **Bấm thật trên trình duyệt** theo đúng luồng người dùng.
- **Query thẳng database** để đối chiếu. Đây là cách duy nhất chứng minh một Draft *không* ghi, hoặc
  một lô ghi đúng N bản ghi.
- **Test cả nhánh lỗi**: gửi lô có 1 item sai và xác nhận không ghi gì; gọi endpoint ghi bằng tài
  khoản Viewer và xác nhận 403.
- **Đếm trước/sau.** "14 trước, 14 sau" là bằng chứng; "có vẻ chạy được" thì không.

## Cách làm việc với Tài (project owner)

- Tài là người quyết định nghiệp vụ duy nhất — **không tự suy đoán business rule**, hỏi thẳng.
- Tài mới làm dự án dạng này lần đầu — giải thích không giả định kiến thức nền, tránh thuật ngữ
  không cần thiết.
- **Khi một yêu cầu mới mâu thuẫn với quyết định đã ghi ở đây, nói ra**, đề xuất sửa decision log,
  để Tài chọn. Log âm thầm lệch với code còn tệ hơn không có log.
- Sau mỗi phiên có thay đổi thực chất, **tóm tắt đã làm gì** — nêu kết quả và quyết định quan trọng,
  không liệt kê từng lệnh.
- Giao tiếp bằng tiếng Việt, giữ thuật ngữ kỹ thuật bằng tiếng Anh khi đã là convention của spec
  (Fixture, Surface, Draft State…).

## Tài liệu

| File | Nội dung |
|---|---|
| [docs/changelog.md](docs/changelog.md) | Lịch sử 11 giai đoạn, bug đáng nhớ và bài học |
| [docs/huong-dan-su-dung.html](docs/huong-dan-su-dung.html) | Sổ tay cho người dùng cuối |
| [docs/spec/](docs/spec/) | Specification nghiệp vụ gốc (Part 01–09) |
