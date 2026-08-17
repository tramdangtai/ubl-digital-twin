Version: 0.2 (Working > Perfect)

# 1. Mục tiêu

Định nghĩa toàn bộ Business Object của hệ thống.

Business Object là nền tảng cho:

- Database
    
- API
    
- UI
    
- State Management
    
- Digital Twin Rendering
    

Một Business Object có thể tồn tại ở hai trạng thái:

1. Draft State trong quá trình người dùng chỉnh sửa.
    
2. Persisted State sau khi Backend lưu thành công.
    

Draft State không phải là một Business Object mới.

Ví dụ:

```text
Fixture Draft
```

là trạng thái tạm thời của:

```text
Fixture
```

không phải một Entity riêng.

---

# 2. Business Hierarchy

```text
Retailer
└── Store
    └── Fixture
        └── Surface
            └── Display Position
                └── Product Assignment
                    └── Product
```

Product Library tồn tại độc lập.

Product được tham chiếu thông qua Product Assignment.

---

# 3. Business Object

## 3.1 Retailer

### Purpose

Đại diện một chuỗi bán lẻ.

### Relationship

```text
Retailer (1) → (N) Store
```

Retailer không trực tiếp chứa:

- Fixture
    
- Surface
    
- Display Position
    
- Product
    

---

## 3.2 Store

### Purpose

Đại diện một cửa hàng thực tế.

### Relationship

```text
Store (1) → (N) Fixture
```

Store là parent trực tiếp của Fixture.

Store không trực tiếp chứa Product.

---

## 3.3 Fixture

### Purpose

Đại diện một cấu trúc trưng bày vật lý trong Store.

Ví dụ:

- Gondola
    
- Endcap
    
- Wall Bay
    
- Island Display
    
- Counter Display
    

### Relationship

```text
Fixture (1) → (N) Surface
```

### Properties

Tối thiểu:

- Fixture Code
    
- Fixture Name
    
- Owner Company
    
- Fixture Type
    
- Width
    
- Height
    
- Depth
    
- Position X
    
- Position Y
    
- Rotation
    
- Status
    

### Ownership

`Owner Company` cho phép phân biệt Fixture của:

- Uncel Bills
    
- Retailer / Competitor
    
- Các owner khác nếu được mở rộng sau này.
    

### Position

Fixture Position được lưu trong coordinate system của Store.

### Rotation

Rotation được lưu bằng degree.

---

## 3.4 Surface

### Purpose

Đại diện một mặt có thể trưng bày của Fixture.

Ví dụ:

- Front
    
- Back
    
- Left
    
- Right
    
- Top
    

### Relationship

```text
Surface (1) → (N) Display Position
```

### Creation Rule

Surface thuộc về Fixture.

Khi Fixture được tạo, hệ thống phải xác định các Surface hợp lệ của Fixture.

Trong Phase 1, Surface Orientation phải thuộc tập orientation được hệ thống hỗ trợ.

Không tạo Surface độc lập ngoài Fixture.

Nếu việc tạo Fixture yêu cầu tạo Surface mặc định, Fixture và các Surface tương ứng phải được tạo trong cùng một Backend transaction.

Không được xảy ra trạng thái:

```text
Fixture đã tồn tại
nhưng Surface bắt buộc chưa được tạo
```

trừ khi Business Rule của Fixture Type cho phép Surface rỗng.

---

## 3.5 Display Position

### Purpose

Là đơn vị trưng bày nhỏ nhất trong hệ thống.

Một Display Position thuộc đúng một Surface.

### Relationship

```text
Surface (1) → (N) Display Position
```

### Product Assignment

Một Display Position có tối đa một Product Assignment đang Active tại một thời điểm.

```text
Display Position (1) → (0..1) Active Product Assignment
```

### Display Type

Phase 1 hỗ trợ:

- Shelf
    
- Hook
    
- Basket
    
- Tray
    
- Pegboard
    
- Other
    

### Properties

- X
    
- Y
    
- Width
    
- Height
    
- Capacity
    
- Facing Limit
    
- Sort Order
    
- Status
    

### Coordinate

X/Y của Display Position được tính tương đối với Surface.

---

## 3.6 Product Library

### Purpose

Danh mục sản phẩm chuẩn của công ty.

Product không phụ thuộc:

- Store
    
- Fixture
    
- Surface
    
- Display Position
    

Một Product có thể được Assignment vào nhiều Display Position khác nhau.

### Properties

- Item Code
    
- Description
    
- Category
    
- Product Group
    
- Brand
    
- Image URL
    
- Status
    

---

## 3.7 Product Assignment

### Purpose

Liên kết Product với Display Position.

### Relationship

```text
Display Position (1) → (0..1) Active Product Assignment

Product Assignment (N) → (1) Product
```

### Properties

- Product
    
- Display Position
    
- Facing Quantity
    
- Display Order
    
- Start Date
    
- End Date
    
- Status
    

Product Assignment là một Business Object độc lập vì nó có lifecycle và thuộc tính riêng.

---

# 4. Business Object Lifecycle

Mọi Business Object có khả năng tạo/chỉnh sửa từ UI phải tuân theo lifecycle:

```text
Create / Edit
↓
Draft State
↓
User Save
↓
Backend Validation
↓
Database Persistence
↓
Persisted Business Object
```

Nếu user Cancel:

```text
Draft
↓
Discard
```

Không tạo hoặc cập nhật Database Record.

---

# 5. Create Fixture Workflow

Fixture được tạo thông qua UI.

```text
User
↓
Select Store
↓
Create Fixture
↓
Enter Fixture Properties
↓
Draft Fixture
↓
Save
↓
Backend Validation
↓
Create Fixture Record
↓
Create required Surface Records
↓
Commit Transaction
↓
Return Persisted Fixture
↓
Render
```

Frontend không tự tạo UUID chính thức cho Persisted Fixture.

UUID của Persisted Business Object phải được Database hoặc Backend cấp.

---

# 6. Edit Fixture Workflow

```text
Select Fixture
↓
Load Persisted Fixture
↓
Edit
↓
Draft State
↓
Save
↓
Backend Validation
↓
Database Update
↓
Return Updated Fixture
↓
Render
```

Nếu Save thất bại:

- Database không được thay đổi.
    
- Draft vẫn có thể được giữ trên UI.
    
- User được thông báo lỗi.
    

---

# 7. Interactive Fixture Editing

Fixture có thể được chỉnh sửa thông qua:

- Property Form
    
- Move
    
- Resize
    
- Rotate
    

Tất cả thao tác UI chỉ thay đổi Draft State cho đến khi Save.

Ví dụ:

```text
User drag Fixture
↓
position_x / position_y thay đổi trong Draft
↓
User Save
↓
Backend
↓
Database
```

Không ghi Database cho mỗi pixel movement.

---

# 8. Create Surface Workflow

Surface không tồn tại độc lập.

```text
Fixture
↓
Surface definition
↓
Backend validation
↓
Surface record
```

Nếu Surface được tạo tự động khi Fixture được tạo, việc tạo phải nằm trong cùng transaction với Fixture.

Nếu Surface được tạo thủ công, Surface phải tham chiếu đến một Fixture đã tồn tại.

---

# 9. Create Display Position Workflow

Display Position được tạo dưới một Surface đã tồn tại.

```text
Surface
↓
+ Display Position
↓
Input properties
↓
Draft
↓
Save
↓
Backend Validation
↓
Database
```

Display Position không được tồn tại nếu Surface parent không tồn tại.

---

# 10. Product Assignment Workflow

Product Assignment được tạo bằng cách:

```text
Select Display Position
↓
Select Product
↓
Enter / confirm assignment properties
↓
Save
↓
Backend validation
↓
Database
```

Một Display Position không được có nhiều hơn một Active Product Assignment.

---

# 11. Quy tắc quan hệ

```text
Retailer
    ↓
Store
    ↓
Fixture
    ↓
Surface
    ↓
Display Position
    ↓
Product Assignment
    ↓
Product
```

Các quy tắc:

- Retailer không chứa Product trực tiếp.
    
- Store không chứa Product trực tiếp.
    
- Fixture không chứa Product trực tiếp.
    
- Surface không chứa Product trực tiếp.
    
- Display Position chỉ tham chiếu Product thông qua Product Assignment.
    
- Product có thể được sử dụng ở nhiều Display Position.
    
- Display Position chỉ có tối đa một Active Product Assignment.
    

---

# 12. Digital Twin Rule

Mọi **Persisted Business Object** được render trong Digital Twin phải có:

- UUID
    
- Business Object
    
- Database Record
    

Không được render một Persisted Digital Twin Object từ hard-coded data.

Tuy nhiên, UI có thể render:

- Form
    
- Input
    
- Draft Preview
    
- Selection Highlight
    
- Resize Handle
    
- Rotation Handle
    

mà không cần Database Record.

Các thành phần này là UI State, không phải Digital Twin Business Object.

---

# 13. Business Object vs UI State

|Thành phần|Business Object|Database Record|
|---|--:|--:|
|Retailer|Yes|Yes|
|Store|Yes|Yes|
|Fixture|Yes|Yes|
|Fixture Draft|No|No|
|Surface|Yes|Yes|
|Display Position|Yes|Yes|
|Display Position Draft|No|No|
|Product|Yes|Yes|
|Product Assignment|Yes|Yes|
|Selection State|No|No|
|Edit Mode|No|No|
|Resize Handle|No|No|

---

# 14. Quy tắc mở rộng

Không bổ sung Business Data trực tiếp vào UI.

Nếu cần dữ liệu mới:

```text
Business Requirement
↓
Business Object / Property
↓
Database
↓
API
↓
UI
```

Nếu chỉ là trạng thái phục vụ interaction:

```text
User Interaction
↓
UI State
```

Không tạo Database field nếu dữ liệu không có ý nghĩa nghiệp vụ.

---

# 15. Tiêu chí hoàn thành

- Hoàn chỉnh Business Hierarchy.
    
- Định nghĩa 7 Business Object.
    
- Định nghĩa Relationship.
    
- Định nghĩa Create/Edit lifecycle.
    
- Phân biệt Business Object và UI State.
    
- Định nghĩa Fixture creation workflow.
    
- Định nghĩa Surface creation relationship.
    
- Định nghĩa Display Position creation relationship.
    
- Định nghĩa Product Assignment lifecycle.
    
- Làm nền cho Database Schema và API Contract.