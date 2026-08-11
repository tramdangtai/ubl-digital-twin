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
- Auth: **CHƯA làm ở Phase 1** (xem quyết định #1 bên dưới).
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

1. **Auth Phase 1: KHÔNG có đăng nhập.** Bổ sung Supabase Auth sau khi luồng CRUD cốt lõi chạy ổn.
   Khi bổ sung: role model = **Admin / Editor / Viewer** (không dùng "department = marketing" như
   TD-07 draft). Permission Matrix cụ thể (ai làm gì) sẽ chốt lại lúc implement auth, không phải bây giờ.
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

Không kéo thêm gì khác từ Phase 2 (Snap/Alignment/Multi-select/Version History/Undo-Redo vẫn để
Phase 2 đúng như spec).

## Trạng thái hiện tại của repo (cập nhật sau Giai đoạn 2, 2026-08-11)

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

### Milestone tiếp theo

**Giai đoạn 3 — Surface View + Display Position**: chuyển view theo Surface (Front/Back/Left/Right/Top),
tạo Display Position, **bulk-generate lưới** (rows×cols) — bắt buộc vì quyết định #2 (nhiều Display
Position/Surface). Xem bảng 7 giai đoạn đầy đủ đã thống nhất với Tài trong lịch sử chat.

## Commands

```bash
npm install
npm run dev          # dev server, http://localhost:3000
npm run build
npm run start
npm run lint
npm run db:generate  # sửa src/lib/db/schema.ts xong thì chạy cái này để sinh migration SQL mới
npm run db:migrate   # apply migration (drizzle/*.sql) lên DB trỏ bởi DATABASE_URL trong .env.local
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
