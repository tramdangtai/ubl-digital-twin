Version: 0.2 (Working > Perfect)

# 1. Mục tiêu

Định nghĩa toàn bộ interaction và state management của Frontend.

Part 05 đảm bảo UI có thể:

- Hiển thị Persisted Digital Twin State.
    
- Cho phép user tạo Business Object.
    
- Cho phép user chỉnh sửa Business Object.
    
- Quản lý Draft State.
    
- Gửi thay đổi đến Backend.
    
- Đồng bộ lại Persisted State sau khi Save.
    
- Xử lý Loading / Success / Error.
    
- Không biến Frontend thành Source of Truth.
    
- Không ghi Database trực tiếp từ UI.
    

---

# 2. Nguyên tắc nền tảng

## 2.1 UI là nơi user tạo và thay đổi dữ liệu

User interaction bắt đầu từ UI.

Ví dụ:

```text
User
↓
Click + Fixture
↓
Enter Width
↓
Move Fixture
↓
Save
```

---

## 2.2 UI không phải Source of Truth

Frontend có thể giữ:

- Persisted Data Cache
    
- Draft Data
    
- Selection
    
- View State
    
- Interaction State
    

nhưng Persisted Business Data cuối cùng phải được xác nhận bởi Backend và lưu trong Database.

---

## 2.3 React State không đồng nghĩa Business Data

React State có thể chứa Business Data đang được hiển thị hoặc chỉnh sửa.

Nhưng:

> React State không phải Database.

Ví dụ:

```text
React:
fixture.width_mm = 2000
```

không có nghĩa:

```text
Database:
fixture.width_mm = 2000
```

cho đến khi Save thành công.

---

# 3. State Architecture

Frontend chia State thành 7 nhóm.

```text
Frontend State
│
├── 1. Persisted Data State
├── 2. Draft State
├── 3. Selection State
├── 4. View State
├── 5. Interaction State
├── 6. Request State
└── 7. Error State
```

---

# 4. Persisted Data State

Đại diện cho dữ liệu đã được API trả về từ Backend.

Ví dụ:

```text
fixtures
stores
surfaces
displayPositions
products
assignments
```

Persisted Data State được dùng để:

- Render Digital Twin.
    
- Populate Inspector.
    
- Populate Explorer.
    
- Populate Product Library.
    

Persisted Data State không được tự sửa như thể Database đã thay đổi.

---

# 5. Draft State

Draft State đại diện cho thay đổi chưa được persistence.

Ví dụ:

```text
persistedFixture:
{
  width_mm: 1800,
  position_x: 1000
}

draftFixture:
{
  width_mm: 2000,
  position_x: 1200
}
```

Database vẫn chứa:

```text
width_mm = 1800
position_x = 1000
```

cho đến khi Save thành công.

---

# 6. Draft State Rules

## 6.1 Draft được tạo khi

- Create Object.
    
- Edit Object.
    
- Move Object.
    
- Resize Object.
    
- Rotate Object.
    
- Edit Property.
    
- Prepare Product Assignment.
    

---

## 6.2 Draft không được

- Được coi là Persisted Data.
    
- Được render như Saved State mà không có Draft Indicator.
    
- Tự động ghi Database.
    
- Tự quyết định Business Rule.
    

---

## 6.3 Draft có thể bị discard

```text
Draft
↓
Cancel
↓
Discard
↓
Persisted State
```

Không gọi Database mutation.

---

# 7. Selection State

Selection State xác định Object đang được user focus.

Các state:

```text
selectedRetailerId
selectedStoreId
selectedFixtureId
selectedSurfaceId
selectedPositionId
selectedProductId
```

Selection State:

- Không phải Business Data.
    
- Không ghi Database.
    
- Không tạo Assignment.
    
- Không tạo Entity.
    

---

# 8. Selection Rules

Mỗi Object Type có tối đa một selected ID.

Ví dụ:

```text
selectedFixtureId = F001
```

Sau khi user chọn F002:

```text
selectedFixtureId = F002
```

Không giữ F001 là selected Fixture.

---

# 9. View State

View State phục vụ việc hiển thị Workspace.

Ví dụ:

```text
zoomLevel
panX
panY
activeSurfaceView
activePanel
```

View State không được persistence vào Business Database trong Phase 1.

---

# 10. Interaction State

Interaction State mô tả UI đang ở trạng thái thao tác nào.

Ví dụ:

```text
interactionMode
```

Các Mode chính:

```text
VIEW
EDIT
CREATE
ASSIGN
```

Có thể mở rộng sau này.

---

# 11. View Mode

Trong View Mode:

User có thể:

- Select
    
- Inspect
    
- Navigate
    
- Pan
    
- Zoom
    

Không được thay đổi Persisted Business Data.

---

# 12. Edit Mode

Trong Edit Mode:

User có thể:

- Edit Properties.
    
- Move.
    
- Resize.
    
- Rotate.
    
- Create.
    
- Archive.
    

Mọi thay đổi trước Save đều đi vào Draft State.

---

# 13. Create Mode

Create Mode dùng khi tạo Business Object mới.

Ví dụ:

```text
CREATE_FIXTURE
```

Workflow:

```text
Select Store
↓
Create Mode
↓
Fixture Draft
↓
User Input
↓
Preview
↓
Save
```

Object chưa được coi là Persisted cho đến khi Backend trả về thành công.

---

# 14. Assign Mode

Assign Mode dùng để tạo Product Assignment.

Workflow:

```text
Select Display Position
↓
Select Product
↓
Assign Mode
↓
Assignment Draft
↓
Confirm
↓
API
↓
Database
```

Đặc biệt:

```text
Select Product
```

không đồng nghĩa:

```text
Create Product Assignment
```

---

# 15. Request State

Mỗi API operation có Request State riêng.

Các trạng thái:

```text
IDLE
LOADING
SUCCESS
ERROR
```

Ví dụ:

```text
fixtureSaveState
```

hoặc:

```text
assignmentSaveState
```

Không nên chỉ có một global `loading = true/false`, vì các khu vực khác nhau có thể có request độc lập.

---

# 16. Request Lifecycle

## 16.1 Read

```text
IDLE
↓
LOADING
↓
SUCCESS
```

Nếu lỗi:

```text
LOADING
↓
ERROR
```

---

## 16.2 Create / Update

```text
Draft
↓
Validate basic input
↓
LOADING
↓
API
↓
Backend Validation
↓
Database
↓
SUCCESS
```

Nếu lỗi:

```text
LOADING
↓
ERROR
↓
Draft retained
```

---

# 17. Error State

Error State phải phân biệt:

## 17.1 Frontend Input Error

Ví dụ:

```text
Width is required
Width must be greater than 0
```

Có thể phát hiện trước khi gọi API.

---

## 17.2 Backend Validation Error

Ví dụ:

```text
Store does not exist
Fixture relationship invalid
Product does not exist
```

Backend trả về.

Frontend chỉ hiển thị.

---

## 17.3 Network / System Error

Ví dụ:

```text
API unavailable
Request timeout
Server error
```

Frontend phải:

- Giữ Draft.
    
- Không giả định Save thành công.
    
- Hiển thị Error State.
    
- Cho phép Retry.
    

---

# 18. Critical Rule: No False Persistence

Frontend tuyệt đối không được hiển thị:

```text
Saved
```

trước khi Backend trả về Success.

Không được:

```text
User clicks Save
↓
UI assumes success
↓
Show persisted data
```

Phải:

```text
User clicks Save
↓
Saving
↓
Backend
↓
Success
↓
Update Persisted State
↓
Show Saved
```

---

# 19. Create Flow — Fixture

```text
1. User selects Store
2. User clicks + Fixture
3. Frontend creates Fixture Draft
4. Inspector displays Draft Form
5. Workspace displays Draft Preview
6. User edits properties
7. User clicks Save
8. Frontend validates basic input
9. Frontend sends API request
10. Backend validates
11. Backend creates Fixture
12. Backend creates required Surface records
13. Database commits transaction
14. API returns persisted data
15. Frontend replaces Draft with persisted data
16. Workspace re-renders
17. Inspector shows persisted data
18. Draft is cleared
```

---

# 20. Update Flow — Fixture

```text
1. User selects Fixture
2. User enters Edit Mode
3. Frontend creates Draft from Persisted Fixture
4. User changes properties
5. Workspace renders Draft
6. User clicks Save
7. Frontend validates basic input
8. API request
9. Backend validates
10. Database updates
11. API returns persisted Fixture
12. Frontend updates Persisted Data State
13. Draft is cleared
14. Workspace re-renders
```

---

# 21. Move Fixture Flow

```text
Select Fixture
↓
Edit Mode
↓
Drag
↓
Update Draft.position_x
Update Draft.position_y
↓
Render Draft
```

Không gọi API cho từng mouse movement.

Sau khi user Save:

```text
Draft Position
↓
PATCH Fixture
↓
Backend
↓
Database
```

---

# 22. Resize Fixture Flow

```text
Select Fixture
↓
Edit Mode
↓
Resize
↓
Update Draft.width_mm
↓
Render Draft
↓
Save
↓
API
↓
Database
```

---

# 23. Rotate Fixture Flow

```text
Select Fixture
↓
Edit Mode
↓
Rotate
↓
Update Draft.rotation_degree
↓
Render Draft
↓
Save
↓
API
↓
Database
```

---

# 24. Display Position Create Flow

```text
Select Surface
↓
+ Display Position
↓
Create Draft
↓
Input properties
↓
Preview
↓
Save
↓
API
↓
Backend Validation
↓
Database
↓
Persisted Display Position
↓
Render
```

---

# 25. Product Selection Flow

```text
User searches Product
↓
Product Library
↓
Click Product
↓
selectedProductId updated
↓
Inspector / Assignment UI displays Product
```

Không có Database mutation.

---

# 26. Product Assignment Flow

```text
Select Display Position
↓
Select Product
↓
Create Assignment Draft
↓
User confirms Assignment
↓
Save
↓
API
↓
Backend Validation
↓
Database
↓
Persisted Product Assignment
↓
Workspace renders Product
```

Nếu Save thất bại:

```text
Assignment Draft remains
```

---

# 27. Cancel Flow

Nếu user đang editing:

```text
Persisted State
↓
Draft
↓
Cancel
↓
Discard Draft
↓
Render Persisted State
```

Không gọi Update API.

---

# 28. Unsaved Changes

Nếu Draft khác Persisted State:

```text
hasUnsavedChanges = true
```

UI phải biểu thị trạng thái này.

Ví dụ:

```text
Fixture F001 *
```

hoặc:

```text
Unsaved Changes
```

---

# 29. Navigation With Unsaved Changes

Nếu user cố chuyển Object khi đang có Draft:

```text
Current Draft
↓
User selects another Object
```

UI phải xác định một trong các hành động:

```text
Save
Cancel
Stay
```

Không tự động discard Draft.

Không tự động save Draft.

---

# 30. Refresh Rule

Sau Create / Update / Archive thành công:

Frontend phải đồng bộ lại Persisted State từ API.

Nguyên tắc:

```text
Mutation
↓
Backend Success
↓
Persisted Response
↓
Update / Refresh Frontend State
```

Frontend không được tự coi Draft là Database.

---

# 31. Optimistic Update

Phase 1 không yêu cầu Optimistic Database Update.

Ưu tiên:

```text
User Action
↓
Draft
↓
Save
↓
API
↓
Success
↓
Persisted State
```

Điều này giúp tránh tình trạng UI hiển thị dữ liệu đã lưu trong khi Database thực tế chưa cập nhật.

---

# 32. State Ownership

Mỗi State phải có owner rõ ràng.

|State|Owner|Database|
|---|---|---|
|Persisted Fixture|API / Frontend Data Layer|Yes|
|Fixture Draft|Frontend|No|
|Selected Fixture|Frontend|No|
|Edit Mode|Frontend|No|
|Zoom|Frontend|No|
|Pan|Frontend|No|
|Loading|Frontend|No|
|Error|Frontend|No|
|Product Master|API / Database|Yes|
|Product Assignment|API / Database|Yes|

---

# 33. API Boundary

Frontend không gọi Database trực tiếp.

```text
React
↓
REST API
↓
Backend
↓
Supabase PostgreSQL
```

Frontend không được chứa:

```text
SQL
```

hoặc logic persistence trực tiếp.

---

# 34. Business Logic Boundary

Frontend có thể kiểm tra các lỗi nhập liệu cơ bản để cải thiện UX.

Ví dụ:

```text
width <= 0
```

Nhưng Backend vẫn phải validate lại.

Nguyên tắc:

```text
Frontend Validation
↓
UX Protection

Backend Validation
↓
Business / Data Protection
```

Frontend validation không thay thế Backend validation.

---

# 35. State Transition

Một Business Object có thể đi qua:

```text
                ┌──────────────┐
                │  Persisted   │
                └──────┬───────┘
                       │
                    Edit
                       │
                       ▼
                ┌──────────────┐
                │    Draft     │
                └──────┬───────┘
                   ┌───┴───┐
                Save      Cancel
                  │          │
                  ▼          ▼
             ┌─────────┐  Persisted
             │ Backend │
             └────┬────┘
                  │
             Success
                  │
                  ▼
              Persisted
```

Nếu Backend Error:

```text
Draft
↓
Backend Error
↓
Draft remains
```

---

# 36. Interaction Safety Rules

UI không được:

1. Tạo Database Record chỉ vì user click Object.
    
2. Update Database cho mỗi pixel movement.
    
3. Tạo Product Assignment chỉ vì Product được selected.
    
4. Hiển thị Saved trước khi API Success.
    
5. Discard Draft mà không có user confirmation khi cần.
    
6. Tự sửa Persisted State nếu Save thất bại.
    
7. Dùng UI State làm Business Data.
    
8. Đưa Business Logic vào React rendering.
    

---

# 37. Example — Complete Fixture Editing Scenario

User muốn thay đổi Fixture F001.

```text
User
↓
Click F001
↓
selectedFixtureId = F001
↓
Inspector loads persisted data
↓
User clicks Edit
↓
Create Fixture Draft
↓
User changes Width
1800 → 2000
↓
Draft.width_mm = 2000
↓
Workspace renders Draft
↓
User drags Fixture
↓
Draft.position_x / position_y updated
↓
User clicks Save
↓
Request = Loading
↓
Backend validates
↓
Database updates
↓
API returns persisted Fixture
↓
Persisted Data State updated
↓
Draft cleared
↓
Request = Success
↓
Workspace renders persisted Fixture
```

Nếu Backend reject:

```text
Backend
↓
Validation Error
↓
Database unchanged
↓
Draft retained
↓
Error displayed
```

Đây là lifecycle chuẩn cho toàn bộ Editable Business Object trong hệ thống.

---

# 38. Tiêu chí hoàn thành

Part 05 hoàn thành khi:

- Phân biệt Persisted Data State và Draft State.
    
- Phân biệt Business Data và UI State.
    
- Định nghĩa Selection State.
    
- Định nghĩa View State.
    
- Định nghĩa Interaction Mode.
    
- Định nghĩa Request State.
    
- Định nghĩa Error State.
    
- Định nghĩa Create Flow.
    
- Định nghĩa Update Flow.
    
- Định nghĩa Cancel Flow.
    
- Định nghĩa Save Flow.
    
- Định nghĩa Fixture Editing Flow.
    
- Định nghĩa Display Position Flow.
    
- Định nghĩa Product Selection Flow.
    
- Định nghĩa Product Assignment Flow.
    
- Định nghĩa Unsaved Changes.
    
- Định nghĩa Navigation với Unsaved Changes.
    
- Định nghĩa API Boundary.
    
- Định nghĩa Business Logic Boundary.
    
- Ngăn chặn False Persistence.
    
- Làm nền cho Part 06 – API Contract.