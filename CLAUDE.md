# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dự án là gì

Digital Twin Platform cho Uncel Bills (UBL) — nhà cung cấp hàng hóa cho chuỗi bán lẻ. Mục tiêu Phase 1:
tái tạo cấu trúc vật lý của từng cửa hàng (Retailer → Store → Fixture → Surface → Display Position →
Product Assignment → Product) dưới dạng dữ liệu có thể tạo/sửa qua UI và lưu vào Postgres. Không làm
AI/Rule Engine/Analytics ở Phase 1 — những thứ đó là Phase 3+ có chủ đích (xem Roadmap).

Business context: UBL sở hữu/quản lý fixture trưng bày trong store của retailer. Hiện quản lý planogram
thủ công; Digital Twin là bước nền tảng trước khi có đủ dữ liệu để build Rule Engine.

## Nguồn sự thật (source-of-truth hierarchy)

```
Quyết định của Tài (business owner, trực tiếp trong chat)
        ↓ khi mâu thuẫn, cái này thắng
CLAUDE.md (file này) — decision log đã chốt
        ↓
Digital Twin Platform Specification/Part 01–09  — Foundation (business/product spec)
        ↓
TECHNICAL DESIGN/TD-00–09                        — Technical design (tham khảo, KHÔNG còn đúng 100%)
        ↓
Implementation (code)
```

**Quan trọng:** TECHNICAL DESIGN/TD-02, TD-04, TD-09 mô tả stack Vite+React / FastAPI+Python /
Vercel Python Functions — **không dùng nữa**. Xem mục "Stack thực tế" bên dưới. Đọc TD-0x để hiểu
*nguyên tắc kiến trúc* (rất tốt, vẫn giữ nguyên) nhưng đừng copy công nghệ cụ thể từ đó.

Part 01–09 (Foundation) và Part 08 (Business Rules) vẫn là nguồn đúng cho **nghiệp vụ**, trừ những chỗ
mục "Quyết định nghiệp vụ đã chốt" bên dưới ghi đè lên các "Pending Decision" mà TD-05/06/07 tự đánh dấu
chưa dám quyết.

File .docx trong `TECHNICAL DESIGN/` khó grep trực tiếp. Muốn đọc nội dung, giải nén bằng PowerShell:
```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("path\to\file.docx")
$entry = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' }
# đọc StreamReader, regex bỏ tag XML
```
(hoặc yêu cầu Claude làm — đã có script dùng được từ phiên trước).

## Stack thực tế (đã chốt, khác TD-02)

- **Full-stack Next.js 15 (App Router)**, KHÔNG tách FastAPI/Python riêng, KHÔNG dùng Vite.
  Lý do: 1 type system, không phải duplicate schema Zod↔Pydantic, 1 deploy target, phù hợp quy mô
  team hiện tại. Nếu sau này cần Python cho Analytics/AI (Phase 3+), thêm như **service riêng** đọc
  chung Postgres — không đổi kiến trúc Phase 1.
- Backend logic = **Next.js Route Handlers** (`src/app/api/**/route.ts`) đóng vai trò lớp Service/API
  mà Part 06/Part 08 mô tả. Route Handler → service function → repository function → Postgres.
  Browser **không bao giờ** gọi Supabase trực tiếp cho mutation nghiệp vụ (đúng nguyên tắc Part 06 §2,
  chỉ khác là "Backend" giờ nằm trong cùng Next.js app thay vì FastAPI riêng).
- Database: Supabase Postgres (giữ nguyên theo spec).
- Auth: **Supabase Auth, đã làm ở Giai đoạn 6** (xem quyết định #1 bên dưới). Middleware
  (`src/middleware.ts`) chặn request chưa đăng nhập ở edge; role Admin/Editor/Viewer check trong từng
  Route Handler qua `src/lib/auth/guard.ts`.
- UI: Tailwind + shadcn/ui (đã cấu hình `components.json`, style "new-york"; chưa cài component cụ thể
  nào — Giai đoạn 1 dùng Tailwind thuần).
- **Data layer: Drizzle ORM + `postgres` (postgres.js driver) — đã khóa, không còn "đề xuất".**
  Schema định nghĩa tại `src/lib/db/schema.ts`, migration sinh bằng `drizzle-kit` vào thư mục
  `drizzle/`, apply bằng `npx tsx scripts/db-migrate.ts` (dùng `drizzle-orm/postgres-js/migrator`,
  có journal nên chạy lại nhiều lần an toàn, không insert trùng). KHÔNG dùng Supabase-js/PostgREST
  cho business mutation — chỉ dùng Supabase-js cho Auth/Storage khi làm tới Giai đoạn 6.
- Rendering: SVG-first (giữ theo TD-02 — quyết định này hợp lý, không đổi).
- State: TanStack Query (server state) + Zustand (draft/selection/UI state) — giữ theo TD-02.

### Ràng buộc kỹ thuật cần nhớ khi implement

Next.js Route Handlers trên Vercel **cũng là serverless function** giống FastAPI Vercel Functions —
nghĩa là vấn đề connection pooling tới Postgres mà TD-09 không hề nhắc tới vẫn tồn tại. Khi viết DB
client cho server-side: dùng Supabase **transaction pooler** (port 6543, `?pgbouncer=true`) hoặc
Supabase-js client, không mở raw long-lived `pg` connection per-request.

**Drizzle `numeric()` mode:** mọi cột `numeric` (mm, tọa độ, rotation) trong `schema.ts` PHẢI khai
`{ mode: "number" }`, nếu không Drizzle trả về **string** thay vì `number` (mặc định của thư viện) —
sẽ vỡ hết phép tính tọa độ/rotation ở tầng Service và Rendering Engine. Khi thêm cột numeric mới
(Display Position, Product ở Giai đoạn 3/4), nhớ áp dụng ngay từ đầu, không phải sửa lại sau (đã từng
phải patch lại `fixture`/`surface`/`display_position`/`product` một lần ở Giai đoạn 2 vì quên chi tiết
này lúc viết schema Giai đoạn 1).

## Nguyên tắc kiến trúc bắt buộc (từ Part 01/04/05/07/08 — không đổi)

1. **Draft vs Persisted**: mọi thay đổi (move/resize/rotate/edit) chỉ tồn tại ở Frontend Draft State
   cho tới khi user bấm Save → API → validate → DB. Không ghi DB theo từng pixel/keystroke.
2. **Database là Source of Truth** sau khi persist thành công. Không hard-code business data trong React.
3. **Physical First**: mọi kích thước lưu bằng **mm** (hậu tố `_mm`), không lưu pixel/zoom/pan vào DB.
4. **No Hard Delete**: mọi entity dùng `status` (Active/Archived), không physical DELETE ở Phase 1.
5. **Frontend không quyết Business Rule**: chỉ validate UX cơ bản (required, > 0). Backend luôn validate
   lại toàn bộ, kể cả khi Frontend đã check.
6. **Rendering Engine không ghi DB, không tính business rule**, chỉ chuyển Business Data → Visual.
7. **Product Selection ≠ Product Assignment**: click chọn product chỉ đổi UI state, không tạo record.
8. **False Persistence bị cấm**: không được hiển thị "Saved" trước khi Backend xác nhận Success.

Chi tiết đầy đủ nằm trong Part 01–08 — đọc khi cần, nhưng 8 điều trên là khung xương không được phá.

## Quyết định nghiệp vụ đã chốt (2026-08-11)

Đây là câu trả lời chính thức cho các "Pending Decision" mà TD-05 §120, TD-06 §132, TD-07 §103-110 tự
đánh dấu chưa dám tự quyết. Coi đây là spec, không phải gợi ý.

1. **Auth: đã implement ở Giai đoạn 6 (2026-08-12).** Supabase Auth (email + password, không self-signup
   công khai — Admin tạo tài khoản trong app). Role model **Admin / Editor / Viewer**, Permission Matrix
   cụ thể đã chốt:
   - **Viewer**: chỉ xem (GET) toàn bộ Digital Twin + Product Library, không tạo/sửa/archive/gán/bulk-
     generate được gì, không truy cập trang Quản lý Người dùng.
   - **Editor**: full CRUD + archive + assign trên Digital Twin và Product Library (như Viewer + ghi),
     không quản lý user khác.
   - **Admin**: như Editor + tạo/khoá/mở khoá tài khoản, đổi role người khác (trang `/users`).
   Chi tiết implement xem mục "Trạng thái hiện tại của repo" phần Giai đoạn 6 bên dưới.
2. **Display Position**: một tầng kệ (Surface) chứa **nhiều** Display Position (mỗi facing/slot riêng),
   đúng theo Part 02/03 gốc — không gộp thành 1 record/tầng. Hệ quả: khối lượng nhập liệu 1 store thật
   sự lớn (~400-4000 Display Position/store) → **Phase 1 phải có công cụ sinh hàng loạt** (xem mục
   "Bổ sung scope Phase 1" bên dưới), không chỉ form nhập tay từng cái.
3. **Hệ tọa độ (Claude tự quyết, chốt tại đây):**
   - **Store space**: origin (0,0) = góc trên-trái mặt bằng store (mốc tự chọn khi tạo Fixture đầu
     tiên, không cần geo-reference thật). Trục X sang phải, **trục Y hướng xuống** (khớp quy ước SVG/
     màn hình, tránh phải lật trục khi render). Đơn vị mm.
     `fixture.position_x/position_y` = góc trên-trái của bounding box **trước khi xoay**.
     `fixture.rotation_degree`: xoay **thuận chiều kim đồng hồ**, quanh **tâm** bounding box (giống
     CSS `transform: rotate()` — dễ implement drag/resize/rotate handle nhất).
   - **Surface space** (relative, theo Part 03 §3.2): origin (0,0) = góc trên-trái của Surface khi nhìn
     trực diện (đứng trước fixture nhìn vào mặt đó). Trục X sang phải theo hướng nhìn của khách hàng,
     **trục Y hướng xuống từ đỉnh Surface** → `display_position.y = 0` là tầng/vị trí **trên cùng**,
     y tăng dần khi xuống thấp (gần sàn). `display_position.x/y` = góc trên-trái bounding box, không
     có rotation (Display Position luôn axis-aligned trong Surface của nó).
4. **Code uniqueness**: `retailer_code`, `store_code`, `fixture_code` — **unique toàn hệ thống** (không
   chỉ trong scope parent). Cùng `item_code` (đã có sẵn trong Part 03).
5. **Archive cascade**: Archive một parent (vd. Store) → **cascade Archive toàn bộ subtree** bên dưới
   (Fixture → Surface → Display Position → Product Assignment liên quan cũng chuyển Archived). Đây là
   business rule bắt buộc ở Service layer (không dùng DB CASCADE trigger phức tạp — set status theo
   thứ tự trong 1 transaction). Implement tại `src/lib/services/cascade.ts`, đã test qua API
   (Retailer archive → Store archive theo, verified bằng script gọi trực tiếp).
   **Hệ quả suy ra khi implement (chưa hỏi riêng, nhưng nhất quán với #5):** KHÔNG cho tạo Active
   child mới dưới một Archived parent (vd. tạo Store dưới Retailer đã Archived → `422
   PARENT_NOT_ACTIVE`). Đây là Resource Existence Rule mở rộng — nếu sau này thấy không đúng ý, báo
   lại để đổi.
6. **Capacity / Facing rules** (best-practice, Claude đề xuất và đã được chốt dùng):
   - `display_position.capacity` INTEGER NULLABLE, `>= 0` khi có giá trị — số lượng đơn vị sản phẩm tối
     đa chứa được về mặt vật lý. Nullable vì không phải lúc nào cũng biết trước.
   - `display_position.facing_limit` INTEGER NULLABLE, `>= 1` khi có giá trị — giới hạn số facing
     (slot mặt tiền) mà merchandising cho phép tại vị trí này. Đây là ràng buộc nghiệp vụ, khác
     `capacity` (ràng buộc vật lý).
   - `product_assignment.facing_qty` INTEGER **NOT NULL, `>= 1`** — **lưu ý: refine từ Part 08 §21
     (`>= 0`) thành `>= 1`**. Lý do: assignment với facing_qty = 0 vô nghĩa; muốn gỡ sản phẩm thì
     archive/end-date assignment, không set về 0.
   - Rule chéo bảng `facing_qty <= facing_limit` (khi `facing_limit` có giá trị): enforce ở **Service
     layer** (không phải DB CHECK vì cross-table), trả `422` nếu vi phạm.
   - `capacity` vs tổng `facing_qty`: **chưa enforce ở Phase 1** — cần dữ liệu kích thước sản phẩm đủ
     tốt trước, để dành Phase 2.
7. **Product Dimensions**: đã thêm `width_mm`, `height_mm`, `depth_mm` (nullable) vào entity `product`,
   khác Part 03 gốc (chưa có). Cần thiết để tính capacity thật và mọi Analytics Phase 3 sau này
   (Shelf Utilization, Empty Space...) — sửa sau sẽ tốn kém hơn nhiều so với thêm ngay bây giờ.
8. **Store dimensions**: KHÔNG thêm kích thước mặt bằng store. Workspace canvas tự giãn theo bounding
   box của các Fixture đã đặt, không giới hạn cứng theo kích thước store.
9. **Concurrency**: tối đa 2-5 user sửa đồng thời trên cùng 1 store → cần **optimistic concurrency**
   đơn giản dựa trên so sánh `updated_at` (client gửi kèm `updated_at` đã load, Service so sánh với
   giá trị hiện tại trong DB, khác nhau → `409 Conflict`, không cần thêm cột `version` riêng).
10. **Quy mô dữ liệu**: ~20 Retailer, ~100 Store, ~4000 SKU. Nhỏ — offset pagination (`page`,
    `page_size`) là đủ, không cần cursor pagination hay search engine riêng, giữ đúng TD-05 §41/§95-96.
11. **Planogram Versioning**: **XÁC NHẬN CẦN**, không phải "để dành Phase 2" như Part 09 §13 gợi ý.
    Nhưng đây là feature lớn, ảnh hưởng lifecycle của mọi entity — **chưa thiết kế schema đầy đủ ở đây,
    cần một phiên thiết kế riêng** trước khi bắt tay Phase 2. Nền tảng Phase 1 (status Active/Archived
    trên mọi entity + `start_date/end_date/status` trên `product_assignment` cho lịch sử assignment)
    đã tương thích, không cần sửa lại khi thêm versioning sau. Không tự ý thiết kế bảng
    `planogram_snapshot`/`planogram_version` khi chưa có yêu cầu cụ thể (đúng nguyên tắc "No Premature
    Architecture" — Part 09 §24).
12. **Product Library**: nguồn ban đầu là **import Excel**, nhưng UI Phase 1 vẫn phải hỗ trợ **thêm/sửa
    tay từng Product** (không chỉ import). Format file Excel sẽ theo đúng cấu trúc field của bảng
    `product` (item_code, description, category, product_group, brand, image_url, width_mm, height_mm,
    depth_mm) — chốt cụ thể khi làm tính năng import.
13. **Workspace cấp Store = top-down floor plan** (nhìn từ trên xuống), không phải nhìn trực diện mặt
    fixture. Bounding box render của Fixture trên canvas này là `width_mm × depth_mm` (chiều ngang ×
    chiều sâu khi đặt trên sàn), KHÔNG phải `width_mm × height_mm`. `height_mm` (chiều cao đứng) không
    xuất hiện ở view này, chỉ có ý nghĩa khi vào Surface View (Giai đoạn 3, nhìn trực diện 1 mặt fixture,
    dùng `surface.width_mm × surface.height_mm`). Đây là cách mọi phần mềm CAD/planogram làm — không có
    trong Foundation gốc nhưng là suy luận bắt buộc từ việc Store có `position_x/position_y` (floor plan
    2D) + `rotation_degree` (chỉ có ý nghĩa khi xoay 1 vật trên mặt sàn). Xem
    `src/lib/rendering/coordinates.ts`.
14. **Fixture mới luôn tự động có 1 Surface "Front"** (transaction cùng lúc tạo Fixture), kích thước =
    `width_mm × height_mm` của Fixture. Back/Left/Right/Top phải tạo thủ công (Giai đoạn 3). Đây là
    implement decision cho Part 02 §3.4 ("hệ thống phải xác định Surface hợp lệ") vì Foundation không
    nói rõ tự tạo bao nhiêu Surface — chọn phương án tối thiểu, không đoán các mặt còn lại.

## Bổ sung scope Phase 1 (so với Part 09 §3 gốc)

Do quyết định #2 (nhiều Display Position/Surface) làm khối lượng nhập liệu quá lớn cho form nhập tay,
Phase 1 phải kéo sớm một phần nhỏ của Part 09 §4 (vốn ghi là Phase 2):
- **Bulk-generate Display Position**: từ Surface, sinh N Display Position cách đều theo lưới
  (rows × columns, spacing) trong 1 lần thao tác thay vì tạo từng cái. Đây vẫn qua Draft → Save →
  Backend transaction như quy trình chuẩn, chỉ là Draft chứa nhiều object thay vì 1.
- **Duplicate Fixture** (copy cả cây con Surface + Display Position) — cân nhắc thêm nếu sau vertical
  slice đầu tiên thấy vẫn cần thiết.
- **Gán hàng loạt Product (Giai đoạn 10, Tài duyệt 2026-08-12)**: chọn 1 Product rồi bấm lần lượt các
  Display Position trên canvas để gán. **Lý do kéo vào Phase 1 giống hệt lý do của Bulk-generate**:
  gán từng ô tốn 5 click + gõ tìm kiếm + 2 lần đổi tab Explorer, nhân với 400–4000 vị trí/store thì
  không ai làm nổi. Vẫn đúng Draft → Save → Backend transaction, chỉ là Draft chứa nhiều
  assignment thay vì 1 — cùng khuôn với Bulk-generate, không phải pattern mới.

Không kéo thêm gì khác từ Phase 2 (Snap/Alignment/Version History/Undo-Redo vẫn để Phase 2 đúng như
spec). **Lưu ý**: dòng này trước đây có ghi cả "Multi-select" — đã bỏ ra vì gán hàng loạt ở trên
chính là dạng multi-select và đã được duyệt vào Phase 1. Undo trong phiên gán (bấm lại ô để gỡ) là
hệ quả tự nhiên của Draft, **không phải** Undo-Redo toàn cục của Phase 2.

## Trạng thái hiện tại của repo (cập nhật sau Giai đoạn 6, 2026-08-12)

**Git/GitHub:**
- Repo đã push lên GitHub thành công: `https://github.com/tramdangtai/ubl-digital-twin`, branch `main`.
  Git identity local đã set (`tramdangtai <tramdangtai.work@gmail.com>`). Lịch sử commit: `4ed03f2`
  (Giai đoạn 1-2) → `beeb939` (Giai đoạn 3) → `97b0094` (Giai đoạn 4). **Giai đoạn 5 (bên dưới) chưa
  commit** — còn nằm ở working tree.
- Máy **có credential GitHub cache** (Git Credential Manager) — `git push` chạy thẳng không cần đăng
  nhập lại, không như lúc đầu dự án (khi đó chưa có `gh` CLI/credential nào, phải nhờ Tài đăng nhập thủ
  công 1 lần).

**Bug đã điều tra và đóng (không phải bug code):** Tài báo "click Save không lưu, hiện Failed to
fetch". Nguyên nhân: dev server (`npm run dev`) không chạy lúc đó — không phải lỗi trong code. Đã verify
kỹ: tạo Retailer/Store/Fixture bằng click thật sau khi bật lại server → tất cả `201 Created`, dữ liệu
có thật trong Supabase. **Bài học: trước khi test app, luôn chạy `npm run dev` và đợi dòng `✓ Ready`.**

**Giai đoạn 1 (Nền móng) đã xong:**
- Repo đã `git init` (chưa commit — commit khi Tài xác nhận).
- Schema Postgres đầy đủ 7 entity tại `src/lib/db/schema.ts`, đã apply thật lên Supabase project
  `Digital_Twin_Planogram` (migration trong `drizzle/`, chạy qua `scripts/db-migrate.ts`).
  Có đủ: PK/FK, CHECK constraint, unique index (kể cả partial unique active-assignment), trigger
  `updated_at` tự động cho cả 7 bảng.
- Data layer: `src/lib/db/client.ts` (Drizzle + postgres.js), `src/lib/validation/*` (Zod),
  `src/lib/api/{errors,response,client}.ts` (error taxonomy + response envelope Part 06 §14 + fetch
  wrapper phía client).
- Service layer + API Route Handlers cho Retailer và Store (`src/lib/services/*`,
  `src/app/api/{retailers,stores}/**`) — CRUD, archive cascade, business validation (parent phải
  Active), đã test qua browser thật + gọi API trực tiếp (404/409/422 đều đúng).
- UI 3-panel (Explorer/Workspace/Inspector) tại `src/app/digital-twin/page.tsx` +
  `src/components/digital-twin/*`, nối API thật qua TanStack Query (`src/lib/api/hooks/*`) + Zustand
  cho Selection/Interaction Mode (`src/lib/state/selection.ts`).
- Sửa 1 bug type-error pre-existing trong `src/lib/supabase/server.ts` (chặn `npm run build`) —
  không liên quan business logic, chỉ thiếu type annotation.

**Giai đoạn 2 (Fixture Authoring + Workspace 2D) đã xong:**
- **Fix layout Explorer/Inspector** (Tài báo bug): panel giờ resizable (kéo `ResizeHandle`, min/max
  clamp) + collapsible (nút thu gọn còn dải 36px), state lưu `localStorage` (không phải DB — đúng View
  State). Workspace có `min-width` sàn 320px; nếu tổng bề rộng panel vượt viewport thì container
  `overflow-x-auto` scroll ngang thay vì bóp Workspace về gần 0 như trước. File: `src/lib/state/panel-
  layout.ts`, `src/components/digital-twin/resize-handle.tsx`, `src/app/digital-twin/page.tsx`.
- Fixture: validation/service/API đầy đủ (`src/lib/validation/fixture.ts`,
  `src/lib/services/fixture.service.ts`, `src/app/api/fixtures/**`) — create tạo kèm Surface "Front"
  mặc định trong **cùng 1 transaction** (quyết định #14), archive cascade xuống Surface (mở rộng
  `cascade.ts` với `archiveFixtureSubtree`, tái dùng bởi `archiveStoreSubtree`).
- Rendering Engine thật: `src/lib/rendering/coordinates.ts` (mm↔px, `fixtureScreenRect` với rotation
  quanh tâm) — quyết định #13 (top-down floor plan, width×depth).
- Draft State cho Fixture: `src/lib/state/fixture-draft.ts` (tách biệt Selection State) — Inspector và
  Workspace cùng đọc/ghi 1 store, đúng nguyên tắc Draft ưu tiên hơn Persisted khi render (Part 07 §4).
- Workspace SVG thật: `src/components/digital-twin/workspace.tsx` — grid nền, zoom (nút +/− và
  mouse-wheel qua native non-passive listener), pan (kéo nền), chọn Fixture (click), **drag-to-move
  trên canvas khi đang Edit Mode** (chỉ hoạt động khi Fixture đó đang được `startEdit`, đúng Part 04
  §18.4 "Drag chỉ được phép trong Edit Mode"), Draft indicator (viền nét đứt + badge "Draft").
- Đã test full qua browser thật + dispatch PointerEvent trực tiếp (vì môi trường preview không chụp
  được screenshot): tạo Fixture → Surface tự tạo (verified trong DB) → drag đổi Position (toán học khớp
  chính xác pxToMm) → chỉnh Rotation qua Inspector (render live theo Draft, chưa ghi DB) → Save → DB có
  đúng position/rotation → **refresh browser vẫn đúng** → Cancel discard đúng (không ghi DB) → Archive
  Fixture cascade xuống Surface (verified) → tạo Fixture dưới Store Archived bị chặn 422 → resize/
  collapse panel hoạt động đúng ở viewport hẹp (700px, có scroll ngang thay vì bóp Workspace).
- **Chưa có**: Display Position/Product/Assignment — chưa có Service/API/UI (dù đã có Table+Constraint
  trong schema từ Giai đoạn 1).
- Dữ liệu test còn trong Supabase dev project (Retailer "Winmart Test"/RET-001, Store "Winmart Giai
  Đoạn 2"/ST-G2, Fixture "FX-001" đã Archived để test cascade, + data test Giai đoạn 1) — an toàn để
  xoá tay hoặc giữ làm demo.

**Giai đoạn 3 (Surface View + Display Position) đã xong:**
- Migration `drizzle/0003_surface_active_orientation_unique.sql` — 1 Fixture không được có 2 Surface
  Active cùng orientation (partial unique index) — đã apply thật lên Supabase, verified qua API
  (tạo trùng "Front" → `409 DUPLICATE_VALUE`, tạo "Back" khác orientation → thành công).
- Backend đầy đủ: `src/lib/validation/{surface,display-position}.ts`,
  `src/lib/services/{surface,display-position}.service.ts`,
  `src/app/api/{surfaces,display-positions,display-positions/bulk}/**`. Bulk-generate validate "lưới
  không vượt kích thước Surface" (verified: lưới 3000×3000mm trên Surface 1800×2100mm → `422
  GRID_EXCEEDS_SURFACE`) + giới hạn `rows*columns <= 500`/lần gọi.
- `cascade.ts` refactor thành 3 lớp (`archiveDisplayPositionIdsSubtree` → `archiveSurfaceIdsSubtree` →
  `archiveFixtureIdsSubtree`), export thêm `archiveSurfaceSubtree`/`archiveDisplayPositionSubtree`.
- Rendering: `positionScreenRect()` trong `coordinates.ts` (Surface-local, không rotation).
- State: `selection.ts` mở rộng (`selectedSurfaceId`, `selectedDisplayPositionId`, 3 mode mới),
  `bulk-generate-draft.ts` (preview lưới trước khi Save), `display-position-draft.ts` (Draft pattern
  giống fixture-draft.ts — **chưa có drag-to-move trên canvas cho Display Position**, chỉnh qua
  Inspector numeric field; có thể bổ sung sau nếu thực tế cần).
- `Explorer.tsx`: cây điều hướng xuống tới Surface → Display Position, "+ Add Surface",
  "+ Add Display Position", "+ Bulk Generate...".
- `Inspector.tsx`: `CreateSurfacePanel`, `SurfaceDetailPanel`, `CreateDisplayPositionPanel`,
  `DisplayPositionDetailPanel`, `BulkGeneratePanel` (preview lưới đồng bộ 2 chiều với Workspace qua
  `bulk-generate-draft.ts`).
- `Workspace.tsx`: thêm Surface View — khi chọn 1 Surface, canvas chuyển từ floor plan Store sang render
  mặt Surface (origin trên-trái, y hướng xuống) + các Display Position bên trong + preview lưới
  bulk-generate (viền chấm cam) + reset zoom/pan tự động khi đổi context giữa 2 view.
- **Bug tìm thấy và đã sửa qua test thật:** lúc refactor `cascade.ts`, hàm `archiveSurfaceIdsSubtree`
  archive đúng Display Position/Assignment bên dưới nhưng **chính Surface đó lại không chuyển
  Archived** — do dòng `where(inArray(surface.fixtureId, surfaceIds))` nhầm cột (copy từ code Giai
  đoạn 2 nhưng quên đổi `fixtureId` thành `surfaceId`). Phát hiện khi archive Surface qua API rồi
  query thẳng DB thấy `status` vẫn `Active`. Đã sửa, verify lại cascade Fixture→Surface→Display
  Position hoạt động đúng toàn chuỗi.
- Đã test qua browser thật (click thật) + API trực tiếp: tạo Surface "Back" thứ 2 trên Fixture có sẵn
  Surface "Front" (Giai đoạn 2 auto-tạo) → mở Surface View → Bulk Generate 3×4 lưới → preview live hiện
  đúng 12 ô → Save → 12 Display Position xuất hiện đúng tọa độ trên canvas → chọn 1 vị trí, Edit
  Width → render Draft live đúng → Save → DB đúng → refresh vẫn đúng.
- **Chưa có**: Product/Product Assignment — chưa có Service/API/UI (dù đã có Table+Constraint từ
  Giai đoạn 1).

**Giai đoạn 4 (Product Library + Product Assignment) đã xong:**
- Backend: `src/lib/validation/{product,product-assignment}.ts`,
  `src/lib/services/{product,product-assignment}.service.ts`,
  `src/app/api/{products,product-assignments}/**`. Product list có search (ILIKE trên item_code/
  description/category/product_group/brand) + offset pagination (quyết định #10). Assignment validate:
  Position/Product phải Active, `facing_qty <= facing_limit` (cross-table, service layer), tối đa 1
  Active Assignment/Position (DB partial unique `uq_assignment_active_position`, đã có sẵn từ Giai
  đoạn 1 schema).
- **Quyết định implement mới**: Archive Product KHÔNG cascade xuống Product Assignment đang tham chiếu
  nó (khác với Retailer/Store/Fixture/Surface/Position — những cái đó cascade xuống con). Lý do: Product
  không nằm trong cây hierarchy Digital Twin (Part 02 §3.6, độc lập), archive chỉ chặn *tạo Assignment
  mới* với Product đó, không đụng lịch sử đã có. Ghi lại vì đây là điểm dễ nhầm với pattern cascade ở
  các entity khác.
- **API response envelope mở rộng**: thêm `apiSuccessPaginated()` trong `response.ts`, trả thêm field
  `meta: {page, pageSize, total}` bên cạnh `data` — Part 06 gốc chưa định nghĩa Pagination Envelope,
  đây là implement decision (additive, không phá cấu trúc `{success, data, message}` cũ).
- UI: Explorer thêm 2 tab "Digital Twin" / "Product Library" (`explorerTab` trong `selection.ts`) vì
  Product Library **không thuộc** cây hierarchy Digital Twin (Part 04 §4) — không lồng trong Explorer
  tree như Fixture/Surface/Position. Đúng nguyên tắc Part 04 §13 "Product Selection ≠ Product
  Assignment": chọn Product chỉ đổi `selectedProductId`, không tự tạo Assignment.
- Tách `inspector.tsx` (đã hơn 1600 dòng) thành `inspector-shared.tsx` (UI primitives dùng chung:
  FieldErrors, GeneralError, NumberField, DetailRow, StatusBadge) + `product-panels.tsx`
  (CreateProductPanel, ProductDetailPanel, AssignProductPanel) — điểm hợp lý để chia file, không phải
  chia sớm.
- `DisplayPositionDetailPanel` hiện thêm khối "Đang trưng bày: [Product] — Unassign" khi có Active
  Assignment, hoặc gợi ý "chưa gán" khi chưa có.
- `Workspace.tsx`: Display Position có Active Assignment → đổi màu xanh lá + hiện tên/item_code Product
  thay vì chỉ display_type (Part 07 §16-17). Chấp nhận N+1 query nhỏ (1 request/position cho
  assignment+product) thay vì viết API batch riêng — hợp lý với quy mô nhỏ (quyết định #10), có thể tối
  ưu sau nếu thực tế thấy chậm khi 1 Surface có hàng trăm Display Position.
- Đã test đầy đủ qua browser thật + API: tạo Product → gán vào Display Position → Workspace hiện đúng
  tên Product màu xanh → **refresh vẫn đúng** → gán lần 2 vào cùng Position bị chặn (`409
  ACTIVE_ASSIGNMENT_EXISTS`) → facing_qty vượt facing_limit bị chặn (`422 EXCEEDS_FACING_LIMIT`) →
  Unassign (archive assignment) → Position trở lại trạng thái trống.

**Giai đoạn 5 (Hoàn thiện vòng đời dữ liệu) đã xong:**
- **Optimistic concurrency (quyết định #9) implement đầy đủ**: schema mới `expectedUpdatedAt` (optional
  string) trong `src/lib/validation/common.ts`, thêm vào cả 7 update schema (retailer/store/fixture/
  surface/display-position/product/product-assignment). Helper dùng chung
  `src/lib/services/concurrency.ts` (`assertNotStale`) — so sánh `new Date(expectedUpdatedAt).getTime()`
  với `existing.updatedAt.getTime()` trong DB, khác nhau → ném `ConflictError` (409, code
  `STALE_UPDATE`). Mọi Service update function gọi hàm này ngay sau khi fetch bản ghi hiện tại, trước
  khi ghi; field `expectedUpdatedAt` luôn bị strip khỏi payload trước khi đưa vào Drizzle `.set()`.
  Frontend: mọi `mutate()` ở Inspector (Retailer/Store/Fixture/Surface/Display Position/Product Detail
  Panel, kể cả nút Archive và Unassign) đều gửi kèm `expectedUpdatedAt: <entity>.updatedAt` lấy từ dữ
  liệu Persisted đang hiển thị. **Verified qua API trực tiếp**: mô phỏng 2 "user" cùng sửa 1 Retailer —
  user B save trước (200, `updatedAt` đổi), user A save sau bằng `updatedAt` cũ (cùng lúc đọc) → đúng
  `409 STALE_UPDATE` với message rõ ràng, dữ liệu KHÔNG bị user A ghi đè. Cũng verified luồng bình
  thường qua UI thật (Save không conflict → 200, cập nhật đúng).
- **Navigation guard cho Draft dạng local-state** (Retailer/Store/Surface/Product Detail Panel — 4 entity
  này dùng `useState` cho Draft, KHÔNG có Zustand draft store riêng như Fixture/Display Position nên
  chuyển selection sẽ unmount và mất Draft im lặng nếu không chặn). Store mới
  `src/lib/state/unsaved-changes.ts` (`useUnsavedChangesStore` + `confirmDiscardUnsavedChanges()`) — 4
  panel trên tự đồng bộ `isDirty` vào đây qua hook dùng chung `useSyncDirty()`
  (`inspector-shared.tsx`). Mọi action đổi selection/tab trong `selection.ts` (selectRetailer,
  selectStore, selectFixture, selectSurface, selectDisplayPosition, selectProduct, setExplorerTab, và
  các startCreate*) gọi `confirmDiscardUnsavedChanges()` trước — nếu đang dirty thì hiện
  `window.confirm()`, Cancel = huỷ điều hướng (giữ nguyên Draft), OK = cho đi tiếp (mất Draft, đúng Part
  05 §29 — không tự động discard mà không hỏi). Fixture/Display Position KHÔNG cần cờ này vì Draft của
  chúng nằm trong Zustand store riêng, sống độc lập với selection (đã verify từ Giai đoạn 2/3 là không
  mất khi điều hướng qua lại). Thêm `useBeforeUnloadGuard()` (gọi ở `digital-twin/page.tsx`) — cảnh báo
  trình duyệt khi đóng tab/refresh lúc còn Draft chưa lưu (gộp cả local-state Draft lẫn 2 Zustand draft
  store kia). **Verified qua browser thật**: sửa Retailer Name (chưa Save) → click sang Retailer khác →
  patch `window.confirm` trả `false` → điều hướng bị chặn, Draft còn nguyên, badge "Unsaved changes"
  hiện đúng cạnh Status badge → patch `window.confirm` trả `true` → điều hướng thành công, Draft bị
  discard đúng (tên trở lại giá trị gốc, không lưu xuống DB).
- **Unsaved Changes indicator**: badge nhỏ "Unsaved changes" (`UnsavedBadge` trong `inspector-shared.tsx`)
  hiện cạnh `StatusBadge` ở header của 4 panel trên khi `isDirty === true`, biến mất ngay sau Save thành
  công hoặc Cancel.
- Error handling: message 409 `STALE_UPDATE` hiển thị qua `GeneralError` (component có sẵn từ Giai đoạn
  1) — không cần thêm UI mới, chỉ cần đảm bảo message tiếng Việt rõ ràng ("Dữ liệu đã bị người khác thay
  đổi... Vui lòng tải lại và thử lại.").
- `npx tsc --noEmit`, `npm run lint`, `npm run build` đều sạch.

**Giai đoạn 6 (Auth & Authorization) đã xong:**
- **DB**: bảng `user_profile` mới (`src/lib/db/schema.ts`) — `userId` tham chiếu `auth.users.id` (Supabase
  Auth quản lý, khai báo tối thiểu qua `pgSchema("auth")` chỉ để làm FK target, KHÔNG migrate/sở hữu bảng
  đó), `role` (Admin/Editor/Viewer), `status` (Active/Archived). Migration `drizzle/0004_*.sql` —
  **lưu ý khi đọc file này**: `drizzle-kit generate` tự sinh thêm `CREATE TABLE "auth"."users"` (vì lần
  đầu khai báo bảng đó trong schema.ts) — đã xoá thủ công dòng đó khỏi migration trước khi apply, vì bảng
  thật đã tồn tại sẵn do Supabase quản lý. Nhớ áp dụng lại thao tác này nếu sau này generate migration
  mới có đụng tới bảng `auth.users`.
- **Session/Guard**: `src/lib/auth/session.ts` (`getCurrentUser()` — đọc Supabase session server-side rồi
  tra `user_profile` lấy role; trả `null` nếu chưa có profile hoặc profile Archived — tài khoản Supabase
  Auth tồn tại không đồng nghĩa được dùng app), `src/lib/auth/guard.ts` (`requireUser`/
  `requireWriteAccess`/`requireAdmin`, ném `AppError` 401/403 — tái dùng `apiError()` có sẵn từ Giai đoạn
  1, không cần sửa response layer).
- **Middleware** (`src/middleware.ts`): lớp authentication (có đăng nhập hay không) — chặn ở edge, redirect
  page chưa đăng nhập về `/login?next=<path>`, trả 401 JSON cho API. Lớp authorization (role làm được gì)
  nằm ở `guard.ts` trong từng Route Handler vì middleware không biết action cụ thể của route.
- **User management**: `src/lib/services/user.service.ts` (tạo user qua Supabase Admin API
  `auth.admin.createUser` với mật khẩu Admin tự đặt — KHÔNG dùng invite-by-email vì không phụ thuộc cấu
  hình SMTP của Supabase project, phù hợp quy mô 2-5 user; Archive user vừa set `status` vừa
  `auth.admin.updateUserById(id, { ban_duration })` để khoá đăng nhập thật ở tầng Supabase Auth, không chỉ
  chặn ở app layer). API: `/api/users`, `/api/users/[id]`, `/api/me`. Trang UI: `/users` (Admin only, tạo
  user mới + đổi role + khoá/mở khoá).
- **Guard 15 route.ts nghiệp vụ có sẵn**: mọi GET gọi `requireUser()`, mọi POST/PATCH gọi
  `requireWriteAccess()` (Viewer bị chặn 403). Optimistic concurrency (Giai đoạn 5) tái dùng nguyên vẹn,
  không đổi.
- **Frontend**: `use-current-user.ts` (`useCurrentUser()` hook + `canWrite(role)` helper), header
  `digital-twin/page.tsx` hiện email/role + nút Đăng xuất + link "Quản lý Người dùng" (chỉ Admin thấy).
  Toàn bộ nút tạo/sửa/archive/unassign trong Explorer + Inspector + Product panels đều gate thêm
  `writable` (Admin/Editor) — Viewer thấy dữ liệu nhưng input field bị `disabled`, không có nút Save/
  Archive/"+"; đây là UX-only, **backend luôn tự validate lại** (đã verify bằng fetch() trực tiếp bypass
  UI, POST vẫn bị 403 dù không hiện nút).
- **Seed Admin đầu tiên**: `scripts/seed-admin.ts` (`npx tsx scripts/seed-admin.ts <email> [password]`) —
  chỉ cần chạy 1 lần lúc mới bổ sung Auth (chicken-and-egg: chưa có Admin thì không tự tạo Admin qua UI
  được). Đã tạo Admin cho Tài (`tramdangtai.work@gmail.com`).
- Đã test đầy đủ qua browser thật: chưa đăng nhập → redirect `/login` đúng; đăng nhập Admin → header đúng
  email/role, thấy "+ Retailer" và "Quản lý Người dùng"; tạo user Editor + Viewer test qua trang `/users`
  → thành công; đăng nhập Viewer → không thấy nút tạo/sửa/archive, input field bị disabled, `fetch()`
  POST trực tiếp bypass UI vẫn bị `403 FORBIDDEN` đúng message; `tsc`/`lint`/`build` sạch (middleware
  build ra bundle riêng 92.7 kB, đúng kỳ vọng Next.js Edge Runtime).
- 2 tài khoản test còn giữ trong Supabase để Tài tiện thử tay: `editor.test@ubl.local` / `TestPass123`
  (role Editor) và `viewer.test@ubl.local` / `TestPass123` (role Viewer) — xoá hoặc khoá qua trang `/users`
  nếu không cần nữa.

**Giai đoạn 8 (Product Image + Export Surface PNG & CSV) đã xong:**
- **Product image**: thêm field `image_url` vào Product create/update form (URL), `ProductThumb`
  component (`src/components/digital-twin/product-thumb.tsx`) — 3 trạng thái: ok/loading/error, dùng
  `useImageStatus` hook (module-level cache tab lifetime). Hiển thị ảnh trong Explorer tree, Inspector
  create/detail panel, AssignProduct chip, AssignmentSection.
- **N+1 elimination**: `useSurfaceAssignments(surfaceId)` thay thế per-position fetch — 1 query trả
  toàn bộ assignment+product của cả Surface. TanStack Query prefix invalidation `["product-assignments"]`
  đảm bảo key `by-surface` refresh khi mutation xảy ra.
- **Toggle chữ/ảnh**: `useSurfaceViewModeStore` (Zustand + persist, key `"ubl-surface-view-mode"`) —
  nút "Chữ | Ảnh" trong WorkspaceHeader; lưu `localStorage` theo Decision D2.
- **Export CSV**: `src/lib/export/surface-csv.ts` — BOM `﻿` + CRLF, 30 cột, sort y rồi x.
  `src/lib/export/filename.ts` — slugify NFD + strip diacritics → tên file `RET-001_ST-G2_...`.
  `src/lib/export/download.ts` — createObjectURL + `<a download>` + setTimeout revokeObjectURL.
- **Export PNG**: `src/lib/export/surface-png.ts` — B1 fetch ảnh URL→data:URI (CORS-safe, 8s timeout,
  allSettled); B2 SVG string (positionScreenRect, header dải tiêu đề, nền trắng); B3 SVG→canvas; B4
  canvas.toBlob(). Nút "⬇ PNG" + "⬇ CSV" trong WorkspaceHeader, chỉ hiện khi ở Surface View.
- `src/lib/rendering/colors.ts` — OCCUPIED/EMPTY fill/stroke/text constants dùng chung workspace + PNG.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` đều sạch — commit `cab6b94`.

**Giai đoạn 9 (Background Image cho Surface) đã xong:**
- **DB**: bảng `background_image` mới + 3 cột vào `surface` (`background_image_id`, `background_opacity`,
  `background_fit`). Migration `drizzle/0005_bumpy_virginia_dare.sql` — đã apply thật lên Supabase.
  `uploadedBy` FK trỏ `user_profile.user_id` (không trỏ `auth.users.id` để tránh drizzle-kit sinh
  `CREATE TABLE "auth"."users"` — CLAUDE.md Giai đoạn 6).
- **Storage**: bucket private `surface-backgrounds` — `scripts/setup-storage.ts` idempotent. Tất cả
  truy cập qua proxy `/api/background-images/[id]/file` (kiểm đăng nhập).
- **Service**: `src/lib/services/background-image.service.ts` — upload→Storage→insert DB (compensating
  cleanup nếu insert fail), `assertNotStale()`, download proxy. `surface.service.ts` mở rộng: validate
  backgroundImageId phải Active khi set.
- **API**: `GET/POST /api/background-images` (GET `requireUser`, POST `requireAdmin` + magic bytes
  check); `PATCH /api/background-images/[id]` (cảnh báo số Surface đang dùng khi Archive, không chặn);
  `GET /api/background-images/[id]/file` (proxy, `Cache-Control: private, max-age=3600, immutable`).
- **Client**: `apiClient.postForm()` — fetch trực tiếp không override Content-Type, để browser tự set
  `multipart/form-data; boundary=...`. `src/lib/images/resize.ts` — `createImageBitmap`+canvas resize
  nếu cạnh dài > 2560px, xuất JPEG q=0.85.
- **Hooks**: `src/lib/api/hooks/use-background-images.ts` — `useBackgroundImages`, `useUploadBackgroundImage`,
  `useUpdateBackgroundImage`, `backgroundImageUrl()` helper.
- **Trang /backgrounds**: `src/app/backgrounds/page.tsx` — Admin only, upload form (preview + resize
  tự động), grid ảnh (hiện size, kích thước, Archive/Restore). Link "Ảnh nền" trong header Admin.
- **Inspector**: `SurfaceDetailPanel` mở rộng 6 field draft (thêm backgroundImageId, backgroundOpacity,
  backgroundFit), checkbox "Hiện ảnh nền", image picker grid 3 cột, opacity slider, fit select.
  `isDirty` check đủ 6 field, Cancel reset đủ 6 field.
- **Workspace**: `SurfaceBackgroundImage` component — `useId()` cho clipPath, `preserveAspectRatio`
  theo `backgroundFit` (contain/cover/stretch), `pointerEvents="none"`, đặt trước Display Positions.
- **PNG export**: `surface-png.ts` mở rộng — fetch background image as data:URI (same-origin, không
  CORS issue), render `<image>` + `<clipPath>` trong SVG trước Display Positions.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` đều sạch.

**Giai đoạn 10 (UI/UX cho luồng sản phẩm cuối) đã xong:**

Xuất phát từ phiên thảo luận UI/UX với Tài (2026-08-12). Ba việc, làm theo thứ tự B → C → A.

- **Phần B — khung Display Position che kín ảnh nền (lỗi Tài phát hiện).** `workspace.tsx` vẽ `fill`
  màu đặc không có `fill-opacity`, ảnh nền của Giai đoạn 9 bị đè 100% → tính năng gần như vô dụng.
  Sửa: khi Surface có ảnh nền thì khung dùng `fillOpacity`, viền dày lên, chữ có dải nền bán trong
  suốt. Thêm nút **"Khung: Đậm | Vừa | Mờ"** trong WorkspaceHeader (chỉ hiện khi có ảnh nền), lưu
  `localStorage` — View State, đúng tiền lệ quyết định D2, **không thêm cột DB**. PNG export áp cùng
  độ mờ để ảnh khớp màn hình. Nhân tiện đổi thứ tự chữ trên canvas thành item_code → description cho
  khớp bản PNG.
- **Phần C — nội dung file PNG.** Dải tiêu đề thêm dòng thống kê (tổng / đã gán / còn trống / số SKU).
  Mỗi ô có **số thứ tự** trong vòng tròn ở góc trên-phải. CSV thêm cột **`stt`** ở đầu (30 → 31 cột),
  dùng chung thứ tự sort `y` rồi `x` với PNG nên số trên ảnh tra được sang CSV.
- **Phần A — gán hàng loạt** (xem mục "Bổ sung scope Phase 1" ở trên để biết lý do kéo vào Phase 1).
  - `src/lib/state/bulk-assign-draft.ts` — Zustand, **không `persist`**. `pending` keyed theo
    `positionId` nên **một phiên gán được nhiều Product khác nhau**. `facingQty` chốt tại lúc dán,
    đổi số ở thanh bar không sửa ngược các ô đã dán (`applyFacingQtyToAllPending()` là hành động
    riêng, có chủ ý). Bấm lại ô đang pending cùng product = gỡ ra — đây chính là undo.
  - **Nguồn sự thật của "đang ở chế độ dán" là `bulkAssignDraft.surfaceId`, KHÔNG phải
    `selection.mode`** — vì mọi action `select*` đều reset `mode` về `"view"`, mà phiên dán phải sống
    sót khi user bấm quanh Explorer trong cùng Surface. `mode` chỉ dùng để Inspector chọn panel.
  - `confirmLeaveBulkAssign()` trong `unsaved-changes.ts` — **cố ý KHÔNG gộp vào cờ `isDirty`** (cờ
    đó cho Draft local-state chết theo unmount). Chỉ hỏi khi thật sự rời Surface đang dán; đổi tab
    Explorer / chọn Product khác **không** hỏi, để user qua lại Product Library được.
  - Canvas: click chuyển từ `pointerdown` sang `pointerup` **có ngưỡng di chuyển 4px** — không có
    ngưỡng này thì kéo pan bắt đầu từ trên một ô sẽ vô tình dán sản phẩm vào đó.
  - `POST /api/product-assignments/bulk` + `bulkCreateProductAssignments()`: validate **toàn bộ
    trước, có lỗi thì không ghi gì** (all-or-nothing), 5 query cố định bất kể bao nhiêu item. Lỗi
    per-item dùng đúng envelope `FieldError[]` sẵn có với `field` dạng `items.<index>.<field>` —
    trùng định dạng path Zod tự sinh nên client parse 1 kiểu cho cả hai nguồn. **Không** dùng
    `onConflictDoNothing` (sẽ âm thầm bỏ item mà vẫn báo thành công).
  - `useBulkCreateProductAssignments()` **`await` invalidate** trong `onSuccess` của hook trước khi
    caller xoá pending — không await thì hàng trăm ô nháy về màu trống 1 frame.
  - Còn ô chưa lưu → **disable nút xuất PNG/CSV** (nguyên tắc #8: file xuất ra không được ngụ ý dữ
    liệu chưa persist là thật).
- **Đã verify qua browser thật + query thẳng Supabase**: dán 5 ô → DB **không đổi** (8 → 8, chứng minh
  Draft không ghi DB); toggle gỡ đúng; bấm ô đã có hàng bị chặn không gọi API; 2 Product trong 1 phiên
  → Save → DB đúng 4 + 2 record; **all-or-nothing**: lô 2 item có 1 item lỗi → `422` với
  `items.1.positionId`, đếm record trước/sau đều 14 (item hợp lệ cũng không được ghi); đổi tab Explorer
  **không hỏi** và draft còn nguyên, rời Surface **có hỏi** và Cancel giữ nguyên draft; Huỷ phiên →
  DB không đổi; Viewer không thấy nút gán hàng loạt, gọi thẳng API vẫn **403**, nhưng **vẫn export
  được** (đúng quyết định D6).
- `npx tsc --noEmit`, `npm run lint`, `npm run build` đều sạch.
- **Dữ liệu test còn lại**: 6 Product Assignment mới trên Surface `Emart Sala / Kệ trái / Front` (4 ô
  item_code `17TY0405`, 2 ô `90686`) — tạo trong lúc test, an toàn để giữ hoặc unassign.

**Giai đoạn 11 (Kéo thả Product + nâng chất lượng UI/UX) đã xong:**

Xuất phát từ yêu cầu của Tài: thêm kéo-thả Product, và tự audit chất lượng UI/UX. Audit làm bằng cách
dùng thật app + đo DOM, không chỉ đọc code.

- **Kết nối DB đã đổi sang transaction pooler** (`aws-0-ap-south-1.pooler.supabase.com:6543`,
  `?pgbouncer=true`) — đúng ràng buộc CLAUDE.md đã ghi từ đầu mà `.env.local` chưa theo.
  `db/client.ts` tự nhận diện pooled và đặt **`prepare: false`** (bắt buộc, pgbouncer transaction mode
  không giữ session giữa các transaction) + `max: 1`. **Biến `DATABASE_URL` trên Vercel cần đổi tương
  ứng** — chưa làm, xem mục dưới.
- **Lỗi API không còn trông giống "chưa có dữ liệu"** (lỗi nghiêm trọng nhất tìm được, chứng kiến trực
  tiếp khi DB mất kết nối): `workspace.tsx` trước đây có **0 chỗ** đọc `isLoading`/`error` → API 500
  thì Explorer trống trơn y hệt lúc chưa có dữ liệu, và nút "+ Retailer" biến mất luôn vì `/api/me`
  cũng lỗi. Nay có `CanvasErrorState` (thông báo + nút Thử lại, nói rõ "dữ liệu vẫn còn trên máy chủ"),
  Explorer có nút Thử lại, và `useCurrentUser` đổi `retry: false` → thử lại 3 lần với lỗi 5xx nhưng
  vẫn không thử lại với 401/403.
- **Phân biệt đang tải / trống**: hết nháy "Chưa có Display Position" mỗi lần mở Surface.
- **Fit-to-view**: mở Surface tự canh vừa khung (trước luôn 25% cố định). `zoomTo` vốn là dead code;
  thêm `fitTo()` + nút "Vừa khung" trong header. Khoá theo `surfaceId` để không đè zoom user tự chỉnh.
- **Bug có sẵn phát hiện khi test tay: wheel zoom chưa bao giờ chạy.** Effect gắn listener chạy 1 lần
  lúc mount, khi đó chưa chọn Store nên `containerRef.current` là `null`, mà deps (`[zoomBy]`) không
  bao giờ đổi nên không gắn lại. Sửa bằng callback ref + state `canvasEl` để effect chạy đúng lúc
  container xuất hiện. **Bài học: `useEffect` phụ thuộc `ref.current` là sai — ref đổi không kích hoạt
  effect.** Fit-to-view lúc đầu cũng dính đúng bẫy này.
- **Zoom bám con trỏ** (`zoomAt`): điểm dưới chuột đứng yên thay vì nội dung trôi đi.
- **Tooltip cho mọi ô** (trước chỉ có trong chế độ dán): displayType, toạ độ, kích thước, sản phẩm +
  facing, capacity, facing limit. Quan trọng nhất với ô hẹp `< 30px` vốn **không vẽ chữ gì cả**.
- **Esc bỏ chọn** (trước không có cách nào bỏ chọn, bấm nền chỉ pan) — `clearDisplayPositionSelection`.
- **Cắt chữ gọn trong ô** bằng `clipPath` — trước description tràn sang ô bên cạnh trong khi bản PNG đã
  cắt gọn, tức màn hình và file xuất ra không khớp.
- **`assignmentMap` bọc `useMemo`** — trước dựng lại Map hàng trăm phần tử mỗi frame pan.
- **Kéo thả Product**: dòng Product trong Explorer `draggable` (chỉ khi có quyền ghi + đang mở Surface),
  ô canvas nhận `dragover`/`drop` với MIME riêng `application/x-ubl-product` (không dùng `text/plain`
  để kéo text lạ từ nơi khác vào không bị hiểu nhầm). Thả xong **vào đúng Draft của gán hàng loạt** →
  vẫn là ô cam chờ Lưu, không ghi DB ngay, tái dùng nguyên đường Save/Huỷ/undo đã có. Ô đã có hàng từ
  chối nhận thả.
- **Sửa lỗi trong chính phần vừa làm, tìm ra khi test**: `startBulkAssignProduct` ép
  `explorerTab: "twin"` → thả xong Explorer nhảy về tab Digital Twin, cướp mất danh sách Product ngay
  lúc user định kéo tiếp cái thứ hai. Đã bỏ dòng ép tab (thanh gán nằm ở Workspace, không liên quan
  Explorer).
- **Đã verify qua browser thật + query Supabase**: kéo thả vào ô trống → "1 ô đang chờ", DB **không
  đổi** (20 → 20); thả vào ô đã có hàng → `dragover` không `preventDefault`, bị từ chối; tab vẫn ở
  Product Library sau khi thả; Esc bỏ chọn (viền cam 1 → 0); wheel zoom 17% → 19% với điểm dưới con trỏ
  chỉ dịch 6px; click chọn ô thường + nút gán hàng loạt + export vẫn hoạt động (không regression).
- Tương phản màu đạt WCAG AA toàn bộ (0 lỗi), vùng bấm đạt chuẩn, không tràn ngang ở 1024px.
- `tsc`/`lint`/`build` sạch.

**Việc Tài cần làm:** đổi biến `DATABASE_URL` trên Vercel sang chuỗi pooler (cùng dạng `.env.local`
hiện tại) — nếu không, production vẫn dùng direct connection và sẽ cạn connection pool khi nhiều
người dùng đồng thời.

### Milestone tiếp theo

**Testing & Deploy**: thêm test runner (Vitest/Playwright) + CI. Deploy production (Vercel) đã chạy
tự động theo `main` từ Giai đoạn 7.

Các cải thiện UI/UX đã khảo sát nhưng Tài **chưa chọn** làm (giữ lại để cân nhắc sau): fit-to-view
khi mở Surface (hiện luôn mở ở 25%, `zoomTo` trong `workspace-view.ts` là dead code), hover tooltip
trên ô, phân biệt trạng thái "đang tải" với "chưa có dữ liệu" (hiện nhấp nháy "Chưa có Display
Position" mỗi lần mở Surface vì `isLoading` không được đọc), breadcrumb, debounce ô tìm kiếm Product
(hiện gọi API mỗi ký tự), phím tắt Enter/Esc trong form, đường khôi phục mục đã Archive.

## Commands

```bash
npm install
npm run dev          # dev server, http://localhost:3000
npm run build
npm run start
npm run lint
npm run db:generate  # sửa src/lib/db/schema.ts xong thì chạy cái này để sinh migration SQL mới
npm run db:migrate   # apply migration (drizzle/*.sql) lên DB trỏ bởi DATABASE_URL trong .env.local
npx tsx scripts/seed-admin.ts <email> [password]  # tạo Admin đầu tiên (chỉ cần 1 lần/môi trường)
```

Chưa có test runner được cấu hình (TD-02 đề xuất Vitest + Playwright — sẽ thêm khi có code cần test,
không thêm trước).

## Cách làm việc với Tài (project owner)

- Tài là người quyết định nghiệp vụ duy nhất cho dự án này — không tự suy đoán business rule khi chưa
  rõ, hỏi thẳng.
- Tài mới làm dự án dạng này lần đầu — giải thích không giả định kiến thức nền có sẵn, tránh thuật ngữ
  không cần thiết.
- **Sau mỗi phiên làm việc có thay đổi thực chất, tóm tắt lại tổng quan đã làm gì** (không cần liệt kê
  từng lệnh, nêu kết quả và quyết định quan trọng).
- Giao tiếp bằng tiếng Việt, giữ thuật ngữ kỹ thuật bằng tiếng Anh khi đã là convention của spec
  (Fixture, Surface, Draft State, v.v.).
