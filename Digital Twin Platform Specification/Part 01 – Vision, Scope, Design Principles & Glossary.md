Version: 0.2 (Working > Perfect)

# 1. Mục tiêu tài liệu

Tài liệu này là nền tảng kỹ thuật để xây dựng Web Application "Digital Twin Platform" cho Uncel Bills.

Đối tượng sử dụng:

- AI Agent (Claude Code, Codex, Gemini CLI...)
    
- Software Developer
    
- Product Owner
    
- Data Analyst
    

Mục tiêu của tài liệu là mô tả hệ thống đủ rõ để AI Agent có thể triển khai mà không phải suy đoán nghiệp vụ.

Part 01 định nghĩa:

- Vision
    
- Scope
    
- Design Principles
    
- Business Terminology
    
- Persistence Philosophy
    
- Ranh giới giữa UI State và Database State
    

---

# 2. Bối cảnh

Uncel Bills là nhà cung cấp hàng hóa cho các chuỗi bán lẻ.

Công ty sở hữu hoặc quản lý các khu vực trưng bày (Fixture) trong cửa hàng của Retailer.

Hiện nay việc quản lý Planogram chủ yếu thực hiện thủ công.

Dữ liệu chưa đầy đủ để xây dựng Rule Engine hoặc tối ưu tự động.

Do đó giai đoạn đầu tập trung xây dựng **Digital Twin** của từng cửa hàng.

Digital Twin phải có khả năng:

- Mô tả cấu trúc vật lý của cửa hàng.
    
- Mô tả Fixture.
    
- Mô tả Surface.
    
- Mô tả Display Position.
    
- Gán Product vào Display Position.
    
- Cho phép người dùng tạo và chỉnh sửa các đối tượng thông qua UI.
    
- Lưu dữ liệu đã xác nhận xuống Database.
    
- Render lại Digital Twin từ dữ liệu đã lưu.
    

---

# 3. Vision

Xây dựng một nền tảng cho phép tái tạo chính xác không gian trưng bày ngoài thực tế dưới dạng số.

Hệ thống có hai trạng thái dữ liệu cần phân biệt rõ:

## 3.1 Transient UI State

Là trạng thái tạm thời trong quá trình người dùng thao tác.

Ví dụ:

- User đang nhập Width = 1800.
    
- User đang kéo Fixture đến vị trí mới.
    
- User đang thay đổi Rotation.
    
- User đang tạo một Fixture nhưng chưa bấm Save.
    
- User đang chỉnh sửa một Display Position nhưng chưa lưu.
    

Transient UI State:

- Có thể tồn tại ở Frontend.
    
- Có thể thay đổi liên tục.
    
- Có thể bị Cancel.
    
- Không được coi là dữ liệu Digital Twin đã lưu.
    
- Không phải Source of Truth.
    

## 3.2 Persisted Digital Twin State

Là dữ liệu đã được Backend chấp nhận và lưu thành công vào Database.

Persisted Digital Twin State:

- Có UUID.
    
- Có Business Object tương ứng.
    
- Có Database Record.
    
- Là nguồn dữ liệu chính để render Digital Twin.
    

### Nguyên tắc

```text
User Input
↓
Frontend Draft State
↓
Backend Validation
↓
Database Persistence
↓
Persisted Digital Twin State
↓
UI Rendering
```

Database là **Source of Truth đối với dữ liệu đã persistence thành công**.

---

# 4. Phạm vi Phase 1

Bao gồm:

- Quản lý Retailer
    
- Quản lý Store
    
- Quản lý Fixture
    
- Quản lý Surface
    
- Quản lý Display Position
    
- Quản lý Product Library
    
- Gán Product vào Display Position
    
- Tạo Business Object từ UI
    
- Chỉnh sửa Business Object từ UI
    
- Lưu thay đổi xuống Supabase
    
- Hủy thay đổi chưa lưu
    
- Archive/Deactivate thay vì Hard Delete
    
- Render Digital Twin từ dữ liệu Database
    

Không bao gồm:

- AI
    
- Rule Engine
    
- ABC Analysis
    
- Sales Analytics
    
- Recommendation
    
- Drag & Drop nâng cao
    
- Tối ưu Planogram
    
- Version Comparison
    
- Advanced Planogram Optimization
    

---

# 5. Nguyên tắc thiết kế

## 5.1 Working > Perfect

Ưu tiên hệ thống chạy được.

Mỗi thay đổi phải có thể:

- Chạy được.
    
- Kiểm tra được.
    
- Demo được.
    
- Có giá trị với người dùng.
    

---

## 5.2 UI First

Mọi dữ liệu nghiệp vụ mới trong Phase 1 được khởi tạo từ thao tác người dùng trên giao diện.

Ví dụ:

```text
User
↓
+ Add Fixture
↓
Input Fixture Properties
↓
Save
↓
Backend
↓
Database
```

UI là nơi **thu nhận dữ liệu từ người dùng**.

UI không phải Source of Truth.

---

## 5.3 Database as Source of Truth

Sau khi Backend lưu thành công:

> Database là nguồn dữ liệu duy nhất cho Persisted Digital Twin State.

Workspace phải render từ dữ liệu đã persistence.

Không hard-code Business Object trong HTML/React.

---

## 5.4 Transient State không phải Business Data

Frontend được phép giữ trạng thái tạm thời để phục vụ quá trình editing.

Ví dụ:

```text
Fixture Draft
Width = 1800
Depth = 600
X = 1200
Y = 800
```

trước khi Save.

Draft này không được coi là một Fixture đã tồn tại trong Digital Twin.

Nếu user Cancel:

```text
Draft
↓
Discard
```

không có Database mutation.

---

## 5.5 Everything Maps To Data

Mọi **Persisted Business Object** được hiển thị trong Digital Twin phải ánh xạ đến:

- Business Object
    
- UUID
    
- Database Record
    

Các thành phần UI thuần túy như:

- Button
    
- Toolbar
    
- Input
    
- Modal
    
- Selection Handle
    
- Draft Preview
    

không phải Business Object và không cần Database Record.

---

## 5.6 Business Logic Outside UI

Frontend chịu trách nhiệm:

- Render dữ liệu.
    
- Thu nhận input.
    
- Quản lý transient UI state.
    
- Gửi request đến Backend.
    
- Hiển thị kết quả từ Backend.
    

Frontend không chịu trách nhiệm quyết định Business Rule.

Backend chịu trách nhiệm:

- Validation.
    
- Business Rule.
    
- Persistence.
    
- Relationship integrity.
    
- Transaction.
    

---

## 5.7 Physical First

Mọi kích thước vật lý lưu trong Database phải sử dụng đơn vị chuẩn:

**millimeter (mm).**

Không lưu kích thước vật lý dưới dạng pixel.

Pixel chỉ là đơn vị render trên màn hình.

Ví dụ:

```text
Database:
width_mm = 1800

UI:
render width = calculated from 1800 mm
```

---

## 5.8 Coordinate System

Hệ thống phải sử dụng một coordinate system thống nhất.

### Store / Fixture

Fixture position:

```text
position_x
position_y
```

được tính theo đơn vị mm trong hệ tọa độ của Store.

### Surface / Display Position

Display Position:

```text
x
y
```

được tính theo đơn vị mm tương đối với Surface mà nó thuộc về.

Không sử dụng pixel làm giá trị tọa độ lưu trữ.

---

## 5.9 Persistence Lifecycle

Mọi thay đổi dữ liệu nghiệp vụ phải đi qua lifecycle:

```text
Create / Edit
↓
Draft
↓
User confirms Save
↓
Backend validation
↓
Database transaction
↓
Success
↓
Frontend refresh / update persisted state
```

Nếu Backend từ chối:

```text
Backend validation failed
↓
Database unchanged
↓
Frontend keeps draft
↓
Display error
```

---

## 5.10 No Hard Delete

Phase 1 không xóa vật lý Business Object.

Thay vào đó sử dụng trạng thái dữ liệu để:

- Active
    
- Inactive / Archived
    
- Các trạng thái khác nếu được định nghĩa sau này.
    

Object đã inactive không được hiển thị như một Active Digital Twin Object.

---

## 5.11 Extensible

Kiến trúc phải hỗ trợ mở rộng mà không phá vỡ Business Object hiện tại.

Nếu một dữ liệu mới có ý nghĩa nghiệp vụ:

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

Không đặt Business Data trực tiếp trong mã nguồn UI.

---

# 6. Thuật ngữ

**Retailer:** Chuỗi bán lẻ.

**Store:** Cửa hàng thực tế thuộc Retailer.

**Fixture:** Kệ hoặc cấu trúc trưng bày vật lý.

**Surface:** Một mặt có thể trưng bày của Fixture.

**Display Position:** Một vị trí trưng bày độc lập trên Surface.

**Product:** Sản phẩm trong Product Library.

**Product Assignment:** Quan hệ giữa Product và Display Position.

**Digital Twin:** Bản sao số của không gian trưng bày thực tế dựa trên Persisted Digital Twin State.

**Draft State:** Trạng thái tạm thời trong quá trình người dùng tạo hoặc chỉnh sửa dữ liệu.

**Persisted State:** Trạng thái đã được Backend validation và lưu thành công vào Database.

---

# 7. Kiến trúc tổng thể

```text
User
↓
React Frontend
↓
REST API
↓
Backend Validation / Business Logic
↓
Supabase PostgreSQL
↓
Supabase Storage
```

Frontend không được ghi trực tiếp vào Database nếu kiến trúc API đã được định nghĩa là lớp persistence.

---

# 8. Data Flow

## 8.1 Read

```text
Database
↓
Backend API
↓
React Frontend
↓
Workspace / Explorer / Inspector
```

## 8.2 Create

```text
User
↓
UI Form
↓
Frontend Draft
↓
Save
↓
Backend
↓
Validation
↓
Database
↓
API Response
↓
Frontend
↓
Render
```

## 8.3 Edit

```text
Persisted Object
↓
User selects Object
↓
Frontend loads Object
↓
User edits
↓
Draft State
↓
Save
↓
Backend Validation
↓
Database Update
↓
Frontend updates
```

## 8.4 Cancel

```text
Persisted Object
↓
Edit
↓
Draft State
↓
Cancel
↓
Discard Draft
↓
Restore Persisted State
```

---

# 9. Tiêu chí hoàn thành Part 01

- Xác định mục tiêu hệ thống.
    
- Xác định phạm vi Phase 1.
    
- Thống nhất thuật ngữ.
    
- Phân biệt Transient UI State và Persisted Digital Twin State.
    
- Xác định Database là Source of Truth sau persistence.
    
- Xác định UI là nơi thu nhận user input.
    
- Xác định lifecycle Create/Edit → Draft → Save → Backend → Database.
    
- Xác định Frontend không chứa Business Logic.
    
- Làm nền cho Business Objects, Database Schema, UI/UX và State Management.