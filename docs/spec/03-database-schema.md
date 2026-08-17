Version: 0.2 (Working > Perfect)

# 1. Mục tiêu

Định nghĩa cấu trúc dữ liệu chuẩn để triển khai trên Supabase PostgreSQL.

Mỗi Persisted Business Object trong Part 02 phải tương ứng với ít nhất một Database Entity.

Database phải đảm bảo:

- Entity integrity.
    
- Relationship integrity.
    
- Physical measurement consistency.
    
- Basic validation.
    
- Persistence consistency.
    

Database không lưu Transient UI State hoặc Draft State.

---

# 2. Quy ước chung

## 2.1 Primary Key

Tất cả Primary Key sử dụng:

```text
UUID
```

Ví dụ:

```text
retailer_id
store_id
fixture_id
surface_id
position_id
product_id
assignment_id
```

---

## 2.2 Foreign Key

Foreign Key sử dụng UUID và phải tham chiếu đến record tồn tại.

---

## 2.3 Timestamps

Mỗi entity có:

- created_at
    
- updated_at
    

---

## 2.4 Status

Mỗi entity có:

```text
status
```

Status dùng để quản lý lifecycle thay vì Hard Delete.

Phase 1 không thực hiện physical hard delete đối với Business Object.

---

## 2.5 Physical Measurement

Tất cả kích thước vật lý được lưu bằng millimeter.

Các field kích thước phải có hậu tố:

```text
_mm
```

Ví dụ:

```text
width_mm
height_mm
depth_mm
```

---

# 3. Coordinate System

## 3.1 Fixture

Fixture position được lưu trong hệ tọa độ của Store:

```text
position_x
position_y
```

Đơn vị:

```text
mm
```

Rotation:

```text
rotation_degree
```

Đơn vị:

```text
degree
```

---

## 3.2 Display Position

Display Position position được lưu tương đối với Surface:

```text
x
y
```

Đơn vị:

```text
mm
```

Không lưu pixel coordinates vào Database.

---

# 4. Entity: retailer

## Purpose

Quản lý chuỗi bán lẻ.

## Fields

- retailer_id (PK)
    
- retailer_code
    
- retailer_name
    
- status
    
- created_at
    
- updated_at
    

## Relationship

```text
Retailer (1) → (N) Store
```

## Validation

- retailer_id phải unique.
    
- retailer_code phải unique.
    

---

# 5. Entity: store

## Fields

- store_id (PK)
    
- retailer_id (FK)
    
- store_code
    
- store_name
    
- address
    
- status
    
- created_at
    
- updated_at
    

## Relationship

```text
Store (1) → (N) Fixture
```

## Validation

- retailer_id phải tồn tại.
    
- store_code không được trùng trong cùng Retailer.
    

---

# 6. Entity: fixture

## Fields

- fixture_id (PK)
    
- store_id (FK)
    
- fixture_code
    
- fixture_name
    
- owner_company
    
- fixture_type
    
- width_mm
    
- height_mm
    
- depth_mm
    
- position_x
    
- position_y
    
- rotation_degree
    
- status
    
- created_at
    
- updated_at
    

## Relationship

```text
Fixture (1) → (N) Surface
```

## Validation

```text
width_mm > 0
height_mm > 0
depth_mm > 0
```

Ngoài ra:

```text
store_id
```

phải tồn tại.

## Coordinate

`position_x` và `position_y` được tính bằng mm trong hệ tọa độ của Store.

## Rotation

`rotation_degree` được lưu bằng degree.

---

# 7. Entity: surface

## Fields

- surface_id (PK)
    
- fixture_id (FK)
    
- surface_name
    
- orientation
    
- width_mm
    
- height_mm
    
- sort_order
    
- status
    
- created_at
    
- updated_at
    

## Relationship

```text
Surface (1) → (N) Display Position
```

## Validation

```text
fixture_id phải tồn tại

width_mm > 0
height_mm > 0
```

`orientation` phải thuộc tập orientation được hệ thống hỗ trợ.

Phase 1:

- Front
    
- Back
    
- Left
    
- Right
    
- Top
    

---

# 8. Entity: display_position

## Fields

- position_id (PK)
    
- surface_id (FK)
    
- display_type
    
- x
    
- y
    
- width_mm
    
- height_mm
    
- capacity
    
- facing_limit
    
- sort_order
    
- status
    
- created_at
    
- updated_at
    

## Relationship

```text
Surface (1) → (N) Display Position
```

## Validation

```text
surface_id phải tồn tại

width_mm > 0
height_mm > 0
```

`x` và `y` được tính tương đối với Surface và sử dụng mm.

---

# 9. Entity: product

## Purpose

Product Master / Product Library.

## Fields

- product_id (PK)
    
- item_code
    
- description
    
- category
    
- product_group
    
- brand
    
- image_url
    
- status
    
- created_at
    
- updated_at
    

## Relationship

Product có thể được tham chiếu bởi nhiều Product Assignment.

## Validation

```text
item_code không được trùng
```

---

# 10. Entity: product_assignment

## Fields

- assignment_id (PK)
    
- position_id (FK)
    
- product_id (FK)
    
- facing_qty
    
- display_order
    
- start_date
    
- end_date
    
- status
    
- created_at
    
- updated_at
    

## Relationship

```text
Display Position (1) → (0..1) Active Product Assignment

Product Assignment (N) → (1) Product
```

## Validation

- position_id phải tồn tại.
    
- product_id phải tồn tại.
    
- facing_qty phải >= 0.
    
- Một Display Position chỉ được có tối đa một Product Assignment có status Active.
    
- start_date không được lớn hơn end_date nếu cả hai cùng tồn tại.
    

---

# 11. Entity Relationship Diagram

```text
Retailer
└── Store
    └── Fixture
        └── Surface
            └── Display Position
                └── Product Assignment
                        └── Product
```

---

# 12. Persistence Rules

## 12.1 Draft State

Database không lưu:

- Fixture Draft
    
- Surface Draft
    
- Display Position Draft
    
- Form State
    
- Selection State
    
- Edit Mode
    
- Resize State
    
- Rotation Handle State
    

Đây là Frontend State.

---

## 12.2 Create Fixture Transaction

Khi Create Fixture yêu cầu tạo Surface mặc định:

```text
BEGIN TRANSACTION

Create Fixture
↓
Create required Surface records
↓
Validate relationships
↓
COMMIT
```

Nếu bất kỳ bước nào thất bại:

```text
ROLLBACK
```

Không được tạo Fixture thành công nhưng tạo Surface thất bại trong cùng một required creation workflow.

---

## 12.3 Edit Transaction

Một lần Save từ UI có thể chứa nhiều field changes.

Backend phải validate toàn bộ request trước khi persistence.

Nếu validation thất bại:

```text
Database remains unchanged
```

---

# 13. Soft Delete / Archive

Phase 1 không sử dụng Hard Delete đối với Business Object.

Thay vào đó:

```text
status = inactive / archived
```

Object inactive không được render như Active Digital Twin Object.

Các relationship không được tự động xóa chỉ vì một object trở thành inactive.

Business Rule chi tiết về cascade/archive sẽ được định nghĩa ở API/Business Logic layer.

---

# 14. Database vs Frontend Responsibility

## Frontend

Chịu trách nhiệm:

- Collect user input.
    
- Maintain draft state.
    
- Send API request.
    
- Render persisted response.
    
- Display validation errors.
    

## Backend

Chịu trách nhiệm:

- Validate request.
    
- Apply Business Rules.
    
- Manage transactions.
    
- Persist data.
    
- Return persisted object.
    

## Database

Chịu trách nhiệm:

- Store persisted data.
    
- Enforce PK.
    
- Enforce FK.
    
- Enforce database-level constraints.
    
- Maintain timestamps.
    
- Maintain data integrity.
    

Không layer nào được dùng Database để lưu UI-only state.

---

# 15. Naming Convention

- snake_case
    
- Singular table name
    
- UUID Primary Key
    
- *_id cho khóa
    
- *_mm cho kích thước thực
    
- *_degree cho rotation
    
- created_at
    
- updated_at
    

---

# 16. API Dependency

Part 03 là nền tảng cho API Contract.

API phải thao tác trên Persisted Business Objects.

Ví dụ:

```text
POST   /stores/{store_id}/fixtures
GET    /stores/{store_id}/fixtures
GET    /fixtures/{fixture_id}
PATCH  /fixtures/{fixture_id}
POST   /fixtures/{fixture_id}/surfaces
POST   /surfaces/{surface_id}/positions
POST   /positions/{position_id}/assignment
PATCH  /assignments/{assignment_id}
```

API Contract chi tiết không thuộc Part 03 và sẽ được định nghĩa ở Part tiếp theo.

---

# 17. Tiêu chí hoàn thành

- Định nghĩa toàn bộ bảng dữ liệu Phase 1.
    
- Hoàn thành khóa chính.
    
- Hoàn thành khóa ngoại.
    
- Hoàn thành validation cơ bản.
    
- Thống nhất physical unit.
    
- Thống nhất coordinate system.
    
- Phân biệt Database State và UI Draft State.
    
- Định nghĩa transaction requirement cho các operation liên quan.
    
- Đảm bảo một Display Position chỉ có tối đa một Active Product Assignment.
    
- Làm nền cho API Contract, State Management và UI/UX Implementation.