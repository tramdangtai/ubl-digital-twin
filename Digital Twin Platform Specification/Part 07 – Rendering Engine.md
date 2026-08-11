Version: 0.2 (Working > Perfect)

# 1. Mục tiêu

Định nghĩa cơ chế chuyển đổi dữ liệu hệ thống thành giao diện hiển thị Digital Twin.

Rendering Engine có nhiệm vụ:

- Nhận Persisted Business Data.
    
- Nhận Draft State khi user đang editing.
    
- Nhận UI Interaction State cần thiết cho visualization.
    
- Chuyển đổi physical measurement thành screen representation.
    
- Render đúng Resource Context.
    
- Render đúng trạng thái hiện tại.
    
- Không chứa Business Logic.
    
- Không ghi Database.
    

Rendering Engine không phải Business Engine.

---

# 2. Rendering Input

Rendering Engine có ba nguồn input chính:

```text
1. Resource Context
2. Persisted Data
3. UI / Draft State
```

---

## 2.1 Resource Context

Được xác định từ Browser URL.

Ví dụ:

```text
/digital-twin/retailers/R1/stores/S1/fixtures/F1
```

Rendering Engine biết:

```text
retailer_id = R1
store_id = S1
fixture_id = F1
```

Resource Context xác định phạm vi dữ liệu cần render.

---

## 2.2 Persisted Data

Được lấy từ API.

Ví dụ:

```text
Fixture
Surface
Display Position
Product Assignment
Product
```

Đây là nguồn Business Data chính thức.

---

## 2.3 Draft State

Khi user đang editing, Rendering Engine có thể nhận Draft State.

Ví dụ:

```text
Persisted:
width_mm = 1800

Draft:
width_mm = 2000
```

Rendering Engine render:

```text
2000 mm
```

nhưng không được cập nhật Database.

---

# 3. Rendering Flow

```text
Browser URL
↓
Resource Context
↓
API
↓
Persisted Data State
↓
             ┌───────────────┐
Draft State →│               │
UI State ───→│   Rendering   │
             │    Engine     │
             └───────┬───────┘
                     ↓
               React Components
                     ↓
                  Browser
```

---

# 4. Rendering Source Priority

Khi một Object đang được edit:

```text
Draft Value
    ↓
Persisted Value
```

Draft Value được ưu tiên cho visualization.

Nếu không có Draft:

```text
Persisted Value
```

được sử dụng.

Ví dụ:

```text
Persisted Width = 1800
Draft Width = 2000

Render Width = 2000
```

Sau Save thành công:

```text
Persisted Width = 2000
Draft = cleared

Render Width = 2000
```

Sau Cancel:

```text
Persisted Width = 1800
Draft = cleared

Render Width = 1800
```

---

# 5. Rendering Boundary

Rendering Engine được phép:

- Transform coordinate.
    
- Convert mm → px.
    
- Apply Scale.
    
- Apply Rotation.
    
- Calculate visual bounding box.
    
- Apply visual styling.
    
- Render selection highlight.
    
- Render Draft Indicator.
    
- Render Error Placeholder.
    

Rendering Engine không được:

- Tính ABC.
    
- Tính Margin.
    
- Tính Recommendation.
    
- Quyết định Product Placement.
    
- Quyết định Business Rule.
    
- Ghi Database.
    
- Tự sửa Business Data.
    

---

# 6. Business Data vs Visual Data

Ví dụ Business Data:

```text
width_mm = 1800
height_mm = 2100
rotation_degree = 90
owner_company = "Uncel Bills"
```

Rendering Engine chuyển thành Visual Representation:

```text
pixelWidth
pixelHeight
screenX
screenY
CSS Transform
Visual Style
```

Visual Representation không được ghi ngược vào Database.

---

# 7. Coordinate System

Database sử dụng physical coordinate:

```text
mm
```

Rendering Engine chuyển đổi:

```text
Physical Coordinate
↓
Scale
↓
Screen Coordinate
```

Ví dụ:

```text
1000 mm
↓
Scale = 0.25 px/mm
↓
250 px
```

---

# 8. Scale Engine

Scale chỉ ảnh hưởng hiển thị.

Ví dụ:

```text
1000 mm
↓
250 px
```

User thay đổi Zoom:

```text
Scale 0.25
↓
Scale 0.50
```

thì:

```text
1000 mm
↓
500 px
```

Database vẫn:

```text
1000 mm
```

---

# 9. Zoom

Zoom là UI/View State.

Zoom không thay đổi:

- width_mm
    
- height_mm
    
- position_x
    
- position_y
    
- rotation_degree
    

Zoom chỉ thay đổi Rendering Scale.

---

# 10. Pan

Pan là UI/View State.

Pan chỉ thay đổi viewport transformation.

Không thay đổi Business Object Position.

Phân biệt:

```text
Fixture position
```

với:

```text
Viewport pan
```

Hai giá trị này không được trộn lẫn.

---

# 11. Rendering Order

Workspace render theo thứ tự:

```text
1. Background
2. Grid
3. Fixture
4. Surface
5. Display Position
6. Product
7. Selection Highlight
8. Draft Indicator
9. Validation / Error Overlay
10. Interaction Handles
```

Layer phía trên được render đè lên layer phía dưới.

---

# 12. Fixture Rendering

Mỗi Fixture phải render:

- Width
    
- Height
    
- Position
    
- Rotation
    
- Owner
    
- Status
    

Fixture geometry phải dựa trên physical dimensions.

Ví dụ:

```text
width_mm = 1800
depth_mm = 600
height_mm = 2100
```

Rendering Engine không được tự thay đổi các giá trị này.

---

# 13. Fixture Owner Visualization

Owner Company có thể được biểu diễn bằng:

- Color
    
- Border
    
- Pattern
    
- Label
    
- Icon
    

Visual distinction chỉ là Presentation.

Không được để:

```text
if color == red
then competitor
```

Business Logic.

Owner phải đến từ Business Data:

```text
owner_company
```

---

# 14. Surface Rendering

Khi Fixture được mở:

```text
Fixture
↓
Surface
```

Rendering Engine render Surface dựa trên:

- orientation
    
- width_mm
    
- height_mm
    
- sort_order
    
- status
    

Surface View được lựa chọn bởi UI State.

Ví dụ:

```text
selectedSurfaceId = FRONT
```

Rendering Engine render Front Surface.

---

# 15. Display Position Rendering

Display Position render theo:

- Display Type
    
- X
    
- Y
    
- Width
    
- Height
    
- Status
    

Physical dimensions được chuyển thành screen dimensions.

---

# 16. Product Rendering

Nếu Display Position có Active Product Assignment:

Render:

- Product Image
    
- Display Name / Short Name nếu available
    
- Item Code
    

Product information phải đến từ Product Data.

Không hard-code Product Name trong React component.

---

# 17. Empty Display Position

Nếu Display Position không có Active Product Assignment:

Render:

```text
Empty Display Position
```

Có thể hiển thị:

- Placeholder
    
- Empty State
    
- Position Outline
    

Không tự động tạo Product Assignment.

---

# 18. Product Selection Rendering

Khi user click Product:

```text
selectedProductId = P001
```

Rendering Engine có thể:

- Highlight Product.
    
- Highlight related Assignment.
    
- Hiển thị Inspector.
    

Selection không làm thay đổi Business Data.

---

# 19. Draft Rendering

Khi user đang chỉnh sửa:

```text
Persisted Object
+
Draft Object
```

Rendering Engine phải ưu tiên Draft values.

Ví dụ:

```text
Persisted:
X = 1000
Y = 500

Draft:
X = 1300
Y = 700
```

Render:

```text
X = 1300
Y = 700
```

Database vẫn:

```text
X = 1000
Y = 500
```

---

# 20. Draft Visual Indicator

Object đang có Draft nên có visual indication.

Ví dụ:

- Dashed border.
    
- Unsaved marker.
    
- Editing outline.
    
- Draft badge.
    

Visual indicator không phải Business Data.

---

# 21. Save Rendering Transition

Trước Save:

```text
Persisted
1800 mm

Draft
2000 mm

Render
2000 mm
```

Save:

```text
Draft
↓
API
↓
Backend
↓
Database
↓
Persisted Response
```

Sau Success:

```text
Persisted
2000 mm

Draft
cleared

Render
2000 mm
```

Rendering Engine không tự quyết định Save thành công.

---

# 22. Failed Save Rendering

Nếu API trả Error:

```text
Persisted
1800 mm

Draft
2000 mm

API Error
```

Rendering Engine tiếp tục render Draft nếu UI vẫn giữ Draft.

UI phải hiển thị Error State.

Không chuyển Draft thành Persisted.

---

# 23. Cancel Rendering

Nếu user Cancel:

```text
Draft
2000 mm
↓
Discard
```

Rendering Engine nhận lại:

```text
Persisted
1800 mm
```

và render 1800 mm.

---

# 24. Selection Rendering

Object được chọn:

- Highlight
    
- Border
    
- Selection Indicator
    

Selection Rendering chỉ dựa trên:

```text
selectedObject
```

Selection không làm thay đổi Business Data.

---

# 25. Interaction Handles

Trong Edit Mode, Rendering Engine có thể render:

- Move Handle
    
- Resize Handle
    
- Rotation Handle
    

Các handle:

- Không phải Business Object.
    
- Không cần Database Record.
    
- Chỉ tồn tại trong UI.
    
- Chỉ thay đổi Draft State.
    

---

# 26. Rendering Error

Nếu Business Object có dữ liệu không hợp lệ:

```text
Fixture
↓
Rendering Error
```

Rendering Engine không được crash toàn bộ Workspace.

Thay vào đó:

```text
Invalid Object
↓
Placeholder
+
Warning Indicator
```

Ví dụ:

```text
Width <= 0
```

có thể render:

```text
⚠ Invalid Fixture
```

---

# 27. Missing Relationship

Nếu Fixture tồn tại nhưng Surface không tải được:

Rendering Engine không được tự tạo Surface giả.

Có thể hiển thị:

```text
⚠ Surface data unavailable
```

Không hard-code fallback Business Object.

---

# 28. Rendering Data Completeness

Rendering Engine phải phân biệt:

## Valid Data

Render Object bình thường.

## Missing Optional Data

Render Object với fallback presentation phù hợp.

## Missing Required Business Data

Render Warning / Placeholder.

Không tự phát minh Business Data.

---

# 29. Rendering Performance

Rendering Engine chỉ render:

- Resource Context hiện tại.
    
- Object đang visible.
    
- Object cần thiết cho viewport.
    

Không render toàn bộ Database nếu không cần.

---

# 30. Partial Rendering

Khi một Fixture thay đổi:

```text
Fixture Update
↓
Update affected state
↓
Re-render affected Fixture
```

Không cần reload toàn bộ Application.

---

# 31. Refresh Strategy

Sau API mutation thành công:

```text
API Response
↓
Persisted Data State
↓
Rendering Engine
↓
Affected Object re-render
```

Không reload toàn bộ browser.

---

# 32. Rendering Engine không gọi Mutation API

Rendering Engine chỉ nhận State.

Không được:

```text
Rendering
↓
API Update
```

Rendering Engine không có quyền persistence.

Nếu user interaction cần thay đổi dữ liệu:

```text
User
↓
Interaction Layer
↓
Draft State
↓
Save Action
↓
API
```

---

# 33. Rendering Engine Input / Output

## Input

```text
Resource Context
Persisted Data
Draft State
Selection State
View State
Interaction State
Validation State
```

## Output

```text
Visual Representation
```

---

# 34. Rendering Architecture

```text
                 Browser URL
                     │
                     ▼
              Resource Context
                     │
                     ▼
                   API
                     │
                     ▼
            Persisted Data State
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
      Draft State           UI State
          │                     │
          └──────────┬──────────┘
                     ▼
             Rendering Engine
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
   Coordinate / Scale       Visual State
          │                     │
          └──────────┬──────────┘
                     ▼
              React Components
                     │
                     ▼
                  Browser
```

---

# 35. Responsibility Boundary

|Layer|Responsibility|
|---|---|
|Browser Router|Resource Context|
|Frontend State|UI / Draft / Selection|
|API|Data Communication|
|Backend|Validation / Business Logic|
|Database|Persistence / Integrity|
|Rendering Engine|Visual Representation|
|React Components|UI Composition|

Không được chuyển Business Logic xuống Rendering Engine.

---

# 36. Tiêu chí hoàn thành

Part 07 hoàn thành khi:

- Định nghĩa Rendering Input.
    
- Định nghĩa Resource Context.
    
- Định nghĩa Persisted Data.
    
- Định nghĩa Draft Rendering.
    
- Định nghĩa Rendering Priority.
    
- Định nghĩa Coordinate Transformation.
    
- Định nghĩa Scale Engine.
    
- Định nghĩa Zoom / Pan.
    
- Định nghĩa Fixture Rendering.
    
- Định nghĩa Surface Rendering.
    
- Định nghĩa Display Position Rendering.
    
- Định nghĩa Product Rendering.
    
- Định nghĩa Selection Rendering.
    
- Định nghĩa Draft Indicator.
    
- Định nghĩa Save / Cancel Rendering Transition.
    
- Định nghĩa Error Rendering.
    
- Định nghĩa Partial Rendering.
    
- Định nghĩa Rendering Performance.
    
- Đảm bảo Rendering Engine không chứa Business Logic.
    
- Đảm bảo Rendering Engine không thực hiện Database Mutation.