Version: 0.2 (Working > Perfect)

# 1. Mục tiêu

Định nghĩa toàn bộ giao diện người dùng của Digital Twin Platform.

UI có hai vai trò chính:

1. Hiển thị Persisted Digital Twin State.
    
2. Cho phép người dùng tạo và thay đổi dữ liệu nghiệp vụ thông qua giao diện.
    

Nguyên tắc nền tảng:

> **UI không phải nơi chứa Business Data lâu dài, nhưng UI phải là nơi người dùng có thể tạo và thay đổi Business Data.**

Frontend chịu trách nhiệm:

- Hiển thị dữ liệu.
    
- Thu nhận thao tác người dùng.
    
- Quản lý Transient UI State.
    
- Quản lý Draft State trong quá trình editing.
    
- Gửi request đến Backend.
    
- Hiển thị kết quả từ Backend.
    
- Hiển thị Validation Error.
    

Frontend không chịu trách nhiệm:

- Quyết định Business Rule.
    
- Làm Source of Truth cho Persisted Data.
    
- Tự ghi Database.
    
- Tự quyết định tính hợp lệ cuối cùng của Business Data.
    

---

# 2. Data State trong UI

UI phải phân biệt rõ ba trạng thái dữ liệu.

## 2.1 Persisted State

Là dữ liệu đã tồn tại trong Database.

Ví dụ:

```text
Fixture F001

Width = 1800 mm
Depth = 600 mm
X = 1200 mm
Y = 800 mm
Rotation = 0°
```

Đây là dữ liệu chính thức của Digital Twin.

---

## 2.2 Draft State

Là bản sao tạm thời của Persisted State đang được người dùng chỉnh sửa.

Ví dụ:

```text
Persisted:
Width = 1800

User changes:
Width = 2000

Draft:
Width = 2000
```

Database vẫn:

```text
Width = 1800
```

cho đến khi user Save thành công.

---

## 2.3 UI State

Là trạng thái phục vụ interaction nhưng không phải Business Data.

Ví dụ:

- Selected Object
    
- Edit Mode
    
- Active Panel
    
- Zoom Level
    
- Pan Position
    
- Loading State
    
- Error State
    
- Modal Open/Close
    
- Hover State
    

UI State không cần Database Record.

---

# 3. Layout tổng thể

Ứng dụng gồm 3 khu vực chính:

```text
+-------------------------------------------------------------+
|                                                             |
| Explorer |              Workspace             | Inspector   |
|          |                                    |             |
|          |                                    |             |
|          |                                    |             |
+-------------------------------------------------------------+
```

## 3.1 Explorer

Điều hướng Digital Twin.

## 3.2 Workspace

Hiển thị và tương tác với Digital Twin.

Workspace là khu vực duy nhất được phép:

- Pan
    
- Zoom
    
- Scroll nội dung
    

## 3.3 Inspector

Hiển thị và chỉnh sửa thuộc tính của Object đang được chọn.

Explorer và Inspector cố định khi Workspace thay đổi kích thước hoặc pan/zoom.

---

# 4. Explorer

## Purpose

Điều hướng toàn bộ Digital Twin.

## Hierarchy

```text
Retailer
└── Store
    └── Fixture
        └── Surface
            └── Display Position
```

Product Library là nguồn dữ liệu độc lập và không nằm trong Digital Twin hierarchy.

---

## Chức năng

Explorer hỗ trợ:

- Expand
    
- Collapse
    
- Search
    
- Select Object
    
- Highlight Selected Object
    
- Hiển thị Icon theo Object Type
    
- Hiển thị trạng thái Active / Inactive nếu cần
    

---

## Object Creation

Explorer có thể cung cấp Create Action phù hợp với Object đang được chọn.

Ví dụ:

```text
Store selected
↓
+ Add Fixture
```

```text
Surface selected
↓
+ Add Display Position
```

Explorer không tự tạo Database Record.

Create Action chỉ khởi tạo Draft Workflow.

---

# 5. Workspace

## Purpose

Hiển thị bản sao số của cửa hàng và cho phép người dùng tương tác với các Business Object.

Workspace phải hỗ trợ:

- Zoom In
    
- Zoom Out
    
- Pan
    
- Scroll nội dung
    
- Grid
    
- Physical Scale
    
- Object Selection
    
- Object Highlight
    
- Draft Preview
    
- Interactive Editing
    

---

## 5.1 Rendering Rule

Workspace render từ Persisted Digital Twin State.

```text
Database
↓
API
↓
Frontend State
↓
Workspace Renderer
```

Không render Business Object bằng hard-coded data.

---

## 5.2 Draft Rendering

Trong Edit Mode, Workspace có thể render Draft State.

Ví dụ:

```text
Database:
Fixture Width = 1800 mm

User edits:
Width = 2000 mm

Workspace:
Render 2000 mm as Draft
```

Điều này không có nghĩa Database đã được cập nhật.

UI phải có cách phân biệt Draft với Persisted State.

Ví dụ:

- Draft indicator
    
- Unsaved indicator
    
- Edit border
    
- Save / Cancel actions
    

---

# 6. Fixture Rendering

Fixture phải hiển thị:

- Đúng tỷ lệ vật lý.
    
- Đúng vị trí.
    
- Đúng hướng xoay.
    
- Đúng Owner.
    
- Đúng trạng thái.
    

Fixture của Uncel Bills và Fixture của Owner khác phải được phân biệt bằng visual treatment đã được thiết kế.

Màu sắc chỉ phục vụ Visualization.

Không được dùng màu UI để chứa Business Logic.

---

# 7. Fixture Authoring

Đây là chức năng cho phép user tạo Fixture từ UI.

## 7.1 Create Fixture

User chọn Store:

```text
Store
↓
+ Add Fixture
```

UI mở Create Fixture Form.

Thông tin tối thiểu:

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
    

Tất cả kích thước vật lý nhập theo mm.

---

## 7.2 Create Fixture Lifecycle

```text
User
↓
Open Create Fixture
↓
Enter Properties
↓
Create Fixture Draft
↓
Preview in Workspace
↓
User confirms Save
↓
API Request
↓
Backend Validation
↓
Database
↓
API Response
↓
Persisted Fixture
↓
Workspace Render
```

Nếu user Cancel:

```text
Draft
↓
Discard
```

Không tạo Database Record.

---

# 8. Fixture Editing

Fixture đã tồn tại có thể được chỉnh sửa.

Các interaction Phase 1:

- Move
    
- Resize
    
- Rotate
    
- Edit Properties
    
- Duplicate nếu được hỗ trợ
    
- Archive
    

---

## 8.1 Move

User:

```text
Select Fixture
↓
Edit Mode
↓
Drag Fixture
```

Frontend thay đổi:

```text
Draft.position_x
Draft.position_y
```

Không gửi Database request cho từng pixel movement.

Khi user Save:

```text
Draft
↓
PATCH Fixture
↓
Backend Validation
↓
Database
```

---

## 8.2 Resize

Fixture có thể được resize bằng:

- Inspector Input
    
- Resize Handle
    

Ví dụ:

```text
1800 mm
↓
2000 mm
```

Workspace render Draft = 2000 mm.

Database vẫn giữ 1800 mm cho đến khi Save thành công.

---

## 8.3 Rotate

User có thể thay đổi:

```text
Rotation = 0°
↓
Rotation = 90°
```

Rotation được lưu trong Draft.

Chỉ khi Save thành công mới trở thành Persisted State.

---

# 9. Surface View

Khi chọn Fixture, user có thể chọn Surface:

- Front
    
- Back
    
- Left
    
- Right
    
- Top
    

Workspace chuyển sang Surface View tương ứng.

---

## 9.1 Surface Relationship

Surface luôn thuộc một Fixture.

Không cho phép user tạo Surface độc lập ngoài Fixture.

Nếu Surface được tạo tự động khi Fixture được tạo, Backend phải đảm bảo Fixture và Surface được persistence trong cùng transaction.

---

# 10. Display Position

Mỗi Display Position render thành một vùng độc lập trên Surface.

Thông tin tối thiểu:

- Display Type
    
- Width
    
- Height
    
- Position
    
- Status
    

Nếu đã có Active Product Assignment:

- Product Image
    
- Display Name / Short Name
    
- Assignment information
    

---

# 11. Display Position Authoring

User có thể:

```text
Select Surface
↓
+ Add Display Position
```

UI tạo Draft Display Position.

User nhập:

- Display Type
    
- X
    
- Y
    
- Width
    
- Height
    
- Capacity
    
- Facing Limit
    
- Sort Order
    

Sau đó:

```text
Save
↓
Backend
↓
Database
```

---

# 12. Product Library Panel

Panel hiển thị:

- Item Code
    
- Description
    
- Category
    
- Product Group
    
- Brand
    
- Image
    

Cho phép:

- Search
    
- Filter
    
- Select Product
    

---

# 13. Product Selection ≠ Product Assignment

Đây là quy tắc quan trọng.

```text
Select Product
```

chỉ thay đổi UI State:

```text
selectedProductId
```

Không tự động tạo Product Assignment.

Để tạo Assignment:

```text
Select Display Position
+
Select Product
↓
Assignment Form / Confirm
↓
Save
↓
API
↓
Database
```

---

# 14. Product Assignment

Product Assignment có thể được tạo hoặc chỉnh sửa từ Inspector.

Thông tin có thể bao gồm:

- Product
    
- Facing Quantity
    
- Display Order
    
- Start Date
    
- End Date
    
- Status
    

User phải xác nhận Save trước khi Database thay đổi.

---

# 15. Inspector

## Purpose

Inspector hiển thị thông tin của Object đang được chọn.

Inspector dùng chung cho:

- Retailer
    
- Store
    
- Fixture
    
- Surface
    
- Display Position
    
- Product Assignment
    
- Product
    

---

## 15.1 View Mode

Trong View Mode:

```text
Persisted Object
↓
Inspector
```

Inspector hiển thị dữ liệu đã lưu.

---

## 15.2 Edit Mode

Trong Edit Mode:

```text
Persisted Object
↓
Create Draft / Edit Draft
↓
Inspector edits Draft
```

Inspector đang hiển thị Draft phải có indicator rõ ràng.

---

## 15.3 Inspector không tính Business Rule

Inspector không tự tính:

- ABC
    
- Recommendation
    
- Optimization
    
- Business Score
    
- Margin Rule
    
- Cross Selling Rule
    

Nếu Backend / Data Engine trả về một giá trị Business Result, Inspector chỉ render giá trị đó.

---

# 16. Edit Mode

UI phải phân biệt:

```text
View Mode
```

và

```text
Edit Mode
```

## View Mode

User có thể:

- Select
    
- Inspect
    
- Navigate
    
- Pan
    
- Zoom
    

Không thay đổi Business Data.

## Edit Mode

User có thể:

- Create
    
- Modify
    
- Move
    
- Resize
    
- Rotate
    
- Assign
    
- Archive
    

Thay đổi được lưu vào Draft State trước.

---

# 17. Save / Cancel

Khi có Draft:

```text
┌──────────────────────────────┐
│ Unsaved Changes              │
│                              │
│ [Cancel]          [Save]     │
└──────────────────────────────┘
```

## Save

```text
Draft
↓
API
↓
Backend Validation
↓
Database
↓
Success
↓
Persisted State
↓
UI Refresh
```

## Cancel

```text
Draft
↓
Discard
↓
Restore Persisted State
```

Cancel không gọi Database mutation.

---

# 18. Interaction

## 18.1 Click Object

```text
Click
↓
Select Object
↓
Highlight
↓
Load Inspector
```

Không tự động Edit.

---

## 18.2 Double Click Fixture

```text
Double Click Fixture
↓
Open Fixture
↓
Select / Open Surface View
```

Không tự động thay đổi Fixture.

---

## 18.3 Click Product

```text
Click Product
↓
selectedProductId
↓
Show Product Information
```

Không tự động tạo Product Assignment.

---

## 18.4 Drag Fixture

Chỉ được phép trong Edit Mode.

```text
Edit Mode
↓
Drag Fixture
↓
Update Draft Position
```

Không update Database trực tiếp.

---

# 19. Selection Rules

Mỗi thời điểm chỉ có một primary selected Object.

Ví dụ:

```text
selectedRetailerId
selectedStoreId
selectedFixtureId
selectedSurfaceId
selectedPositionId
selectedProductId
```

Selection State không phải Business Data.

Selection không làm thay đổi Database.

---

# 20. Error Display

Nếu dữ liệu không hợp lệ:

- Hiển thị Validation Error.
    
- Giữ Draft nếu có thể sửa.
    
- Không làm ứng dụng dừng.
    
- Không ghi dữ liệu không hợp lệ vào Database.
    

Ví dụ:

```text
Width <= 0
Height <= 0
Depth <= 0
Product không tồn tại
Surface không tồn tại
Invalid Position
```

---

# 21. Loading & Saving Feedback

Khi Save:

```text
Draft
↓
Saving...
```

UI phải:

- Disable thao tác có thể gây conflict.
    
- Hiển thị Saving Indicator.
    
- Không tạo duplicate request nếu chưa có kết quả.
    

Sau thành công:

```text
Saving
↓
Saved
```

Sau thất bại:

```text
Saving
↓
Error
↓
Draft retained
```

---

# 22. Workspace Navigation

Workspace hỗ trợ:

- Pan
    
- Zoom
    
- Scroll
    
- Grid
    
- Scale
    

Navigation State không được lưu vào Database.

Ví dụ:

```text
zoom = 0.8
panX = 300
panY = 150
```

đây là UI State.

---

# 23. UI/UX Boundary

Frontend được phép:

```text
Read
Render
Select
Input
Edit Draft
Validate Basic Input
Request Save
```

Frontend không được:

```text
Decide Business Rule
Write Database Directly
Hard-code Business Data
Treat Draft as Persisted
Create Assignment from Selection Alone
```

---

# 24. Tiêu chí hoàn thành

Part 04 hoàn thành khi:

- Định nghĩa đầy đủ Explorer.
    
- Định nghĩa Workspace.
    
- Định nghĩa Inspector.
    
- Định nghĩa Product Library.
    
- Định nghĩa View Mode.
    
- Định nghĩa Edit Mode.
    
- Định nghĩa Fixture Authoring.
    
- Định nghĩa Fixture Editing.
    
- Định nghĩa Surface View.
    
- Định nghĩa Display Position Authoring.
    
- Định nghĩa Product Selection.
    
- Phân biệt Product Selection và Product Assignment.
    
- Định nghĩa Draft State.
    
- Định nghĩa Save / Cancel.
    
- Định nghĩa Error / Loading State.
    
- Đảm bảo UI không chứa Business Logic.
    
- Làm nền cho Part 05 – Interaction & State Management.