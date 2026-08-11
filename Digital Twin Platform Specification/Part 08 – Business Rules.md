Version: 0.2 (Working > Perfect)

# 1. Mục tiêu

Định nghĩa các Business Rule áp dụng cho Digital Twin Platform.

Business Rule được thực thi ở:

- Backend
    
- Service Layer
    
- Database Constraint khi phù hợp
    

Frontend có thể thực hiện Basic Input Validation để cải thiện UX, nhưng không được coi đó là Business Rule cuối cùng.

Nguyên tắc:

```text
User Interaction
↓
Frontend Draft
↓
API Request
↓
Backend Validation
↓
Business Rules
↓
Database Transaction
↓
Persisted State
```

Business Rule không thuộc:

- React Component
    
- UI Renderer
    
- Rendering Engine
    
- Browser URL
    
- Frontend-only State
    

---

# 2. Business Rule vs UI Validation

Phải phân biệt hai loại validation.

## 2.1 Frontend Validation

Mục đích:

- Phản hồi nhanh cho user.
    
- Ngăn input rõ ràng không hợp lệ.
    
- Cải thiện UX.
    

Ví dụ:

```text
Width is required.
Width must be greater than 0.
```

Frontend Validation không phải Source of Truth.

---

## 2.2 Backend Business Validation

Mục đích:

- Bảo vệ Business Data.
    
- Bảo vệ Relationship.
    
- Bảo vệ Database Integrity.
    
- Enforce Business Rule.
    

Backend phải validate lại request ngay cả khi Frontend đã validate.

Ví dụ:

```text
Frontend:
width > 0

Backend:
width > 0
+
fixture belongs to store
+
owner_company valid
+
business constraints valid
```

---

# 3. Persisted State Rule

Business Rule chỉ áp dụng khi Business Data được đưa vào persistence workflow.

Draft State:

```text
Frontend
↓
Draft
```

chưa phải Persisted Business Data.

Khi user chưa Save:

```text
Database = unchanged
```

Business Rule không được coi Draft là một Database Record.

---

# 4. Resource Existence Rule

Business Object phải tồn tại trước khi tạo child object.

Hierarchy:

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

Các rule:

- Retailer phải tồn tại trước khi tạo Store.
    
- Store phải tồn tại trước khi tạo Fixture.
    
- Fixture phải tồn tại trước khi tạo Surface.
    
- Surface phải tồn tại trước khi tạo Display Position.
    
- Product phải tồn tại trước khi tạo Product Assignment.
    
- Display Position phải tồn tại trước khi tạo Product Assignment.
    

---

# 5. Relationship Integrity Rule

Business Object phải thuộc đúng parent của nó.

Không cho phép:

```text
Fixture không thuộc Store.
Surface không thuộc Fixture.
Display Position không thuộc Surface.
Product Assignment không thuộc Display Position.
```

Backend phải kiểm tra relationship trước persistence.

---

# 6. Resource Context Rule

Khi request được thực hiện thông qua Resource Context:

```text
Retailer
↓
Store
↓
Fixture
```

Backend phải đảm bảo object thực sự thuộc context đó.

Ví dụ:

```text
Store S001
Fixture F001
```

Nếu F001 không thuộc S001:

```text
Request
↓
Context Validation
↓
Reject
```

Không được chỉ kiểm tra rằng `F001` tồn tại.

---

# 7. Retailer Rules

## 7.1 Identity

Mỗi Retailer có:

- Unique retailer_id
    
- Unique retailer_code
    

## 7.2 Status

Retailer có lifecycle status.

Object Archived không hiển thị trong danh sách Active mặc định.

---

# 8. Store Rules

## 8.1 Parent

Store phải thuộc một Retailer tồn tại.

## 8.2 Store Code

Store Code phải unique trong phạm vi Retailer.

Ví dụ:

```text
Retailer A
├── Store 001
└── Store 002

Retailer B
└── Store 001
```

có thể hợp lệ nếu uniqueness được định nghĩa theo Retailer.

---

# 9. Fixture Rules

## 9.1 Parent

Fixture phải thuộc một Store tồn tại.

## 9.2 Required Properties

Fixture phải có:

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
    

## 9.3 Physical Dimensions

Các kích thước vật lý phải sử dụng millimeter.

```text
width_mm > 0
height_mm > 0
depth_mm > 0
```

Không chấp nhận:

```text
0
negative values
```

---

# 10. Fixture Position Rules

Fixture Position được lưu trong coordinate system của Store.

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

Rendering Engine không được thay đổi giá trị Business Data để phục vụ viewport.

---

# 11. Fixture Owner Rule

Fixture phải có Owner Company.

Phase 1 hỗ trợ tối thiểu:

```text
Uncel Bills
Competitor
```

Owner Company là Business Data.

UI có thể dùng Owner Company để quyết định Presentation, ví dụ:

```text
Owner Company
↓
Visual Treatment
```

nhưng:

> Color hoặc visual style không phải Business Rule.

Không được suy luận Owner Company ngược lại từ màu UI.

---

# 12. Fixture Creation Transaction Rule

Nếu Fixture Type yêu cầu Surface mặc định:

```text
Create Fixture
↓
Create Required Surfaces
↓
Commit
```

phải nằm trong cùng transaction.

Nếu một bước thất bại:

```text
ROLLBACK
```

Không được có trạng thái:

```text
Fixture persisted
+
Required Surface missing
```

trừ khi Business Rule của Fixture Type cho phép Fixture không có Surface.

---

# 13. Surface Rules

Surface phải:

- Thuộc đúng Fixture.
    
- Có Orientation hợp lệ.
    
- Có kích thước hợp lệ.
    

Phase 1 Orientation:

```text
Front
Back
Left
Right
Top
```

Kích thước:

```text
width_mm > 0
height_mm > 0
```

Surface không tồn tại độc lập ngoài Fixture.

---

# 14. Display Position Rules

Display Position phải:

- Thuộc một Surface.
    
- Có Display Type hợp lệ.
    
- Có Width > 0.
    
- Có Height > 0.
    
- Có X/Y hợp lệ trong coordinate system của Surface.
    

X/Y sử dụng:

```text
mm
```

---

# 15. Display Position / Surface Relationship

Display Position không được tồn tại nếu Surface parent không tồn tại.

Không được tạo Display Position với:

```text
surface_id = NULL
```

hoặc một Surface không tồn tại.

---

# 16. Product Rules

## 16.1 Identity

Item Code phải unique.

Không cho phép hai Product Active có cùng Item Code.

## 16.2 Product Reuse

Một Product có thể được Assignment vào nhiều Display Position.

Ví dụ:

```text
Product P001
├── Position A
├── Position B
└── Position C
```

Điều này hợp lệ.

---

# 17. Product Selection Rule

Product Selection trong Frontend không phải Business Mutation.

```text
User clicks Product
↓
selectedProductId
```

không tạo Product Assignment.

Business Mutation chỉ xảy ra khi:

```text
User confirms Assignment
↓
POST Product Assignment
```

---

# 18. Product Assignment Rules

Product Assignment phải tham chiếu:

- Một Display Position tồn tại.
    
- Một Product tồn tại.
    

Không cho phép:

```text
Position không tồn tại
Product không tồn tại
```

---

# 19. Active Assignment Rule

Một Display Position chỉ được có tối đa:

```text
1 Active Product Assignment
```

Nếu Position đã có Active Assignment:

```text
Create another Active Assignment
↓
Reject
↓
409 Conflict
```

Muốn thay Product:

```text
Existing Assignment
↓
Edit / End / Archive
↓
New Assignment
```

Business Rule chi tiết cho Assignment History sẽ được mở rộng ở Future Version.

---

# 20. Assignment Date Rule

Nếu Assignment sử dụng:

- start_date
    
- end_date
    

thì:

```text
start_date <= end_date
```

khi cả hai cùng tồn tại.

Date overlap logic cho nhiều Assignment lịch sử là Future Extension và không phải Phase 1 Rule bắt buộc nếu hệ thống chưa hỗ trợ Assignment Versioning.

---

# 21. Facing Quantity Rule

Facing Quantity phải là giá trị hợp lệ theo Business Data Contract.

Phase 1 tối thiểu:

```text
facing_qty >= 0
```

Các rule nâng cao như:

```text
facing_qty <= physical_capacity
```

chỉ được enforce khi Capacity Model đã được định nghĩa đầy đủ.

Không tự suy diễn Capacity Rule trong Frontend.

---

# 22. Archive Rule

Phase 1 không sử dụng Hard Delete đối với Business Object.

Thay vào đó:

```text
status = Archived
```

hoặc status tương đương được định nghĩa trong Data Model.

Archived Object:

- Không hiển thị trong Active View mặc định.
    
- Không được tạo relationship mới nếu Business Rule không cho phép.
    
- Vẫn tồn tại trong Database.
    

---

# 23. Parent Archive Rule

Việc Archive Parent không mặc nhiên được hiểu là Hard Delete Child.

Ví dụ:

```text
Store Archived
```

không có nghĩa:

```text
Fixture DELETE
Surface DELETE
Position DELETE
```

Cascade Archive Policy phải được định nghĩa rõ khi cần.

Phase 1 không tự động cascade destructive delete.

---

# 24. Data Integrity Rule

Database phải bảo vệ tối thiểu:

- Primary Key.
    
- Foreign Key.
    
- Required Field.
    
- Unique Key.
    
- Numeric Constraint.
    
- Assignment Constraint khi phù hợp.
    

Backend Service Layer chịu trách nhiệm Business Rule phức tạp hơn Database Constraint.

---

# 25. Rendering Rule Boundary

Business Rule không nằm trong Rendering Engine.

Rendering Engine chỉ nhận:

```text
Business Data
+
Draft State
+
UI State
```

và tạo:

```text
Visual Representation
```

Ví dụ:

```text
owner_company = Competitor
↓
Rendering
↓
Competitor visual style
```

Rendering không được tự quyết định:

```text
Competitor
→ should be removed
```

hoặc:

```text
Competitor
→ should receive Product X
```

---

# 26. URL Rule Boundary

Browser URL chỉ xác định Resource Context.

Ví dụ:

```text
/digital-twin/retailers/R1/stores/S1/fixtures/F1
```

URL không chứa Business Rule.

URL không được quyết định:

- Product Assignment.
    
- Fixture Ownership.
    
- Capacity.
    
- Recommendation.
    
- Optimization.
    

Các quyết định đó thuộc Backend / Business Rule Layer.

---

# 27. Draft Rule

Draft có thể thay đổi:

```text
position_x
position_y
width_mm
height_mm
depth_mm
rotation_degree
```

nhưng chưa phải Persisted Business State.

Chỉ khi:

```text
Draft
↓
Save
↓
Backend Validation
↓
Success
```

mới trở thành Persisted State.

---

# 28. Save Rule

Frontend không được hiển thị trạng thái:

```text
Saved
```

trước khi Backend trả về Success.

Flow bắt buộc:

```text
Save
↓
API Request
↓
Backend Validation
↓
Database Transaction
↓
Success
↓
Persisted Response
↓
Frontend State Update
```

---

# 29. Failed Mutation Rule

Nếu Backend Reject:

```text
Database unchanged
Draft retained
Error displayed
```

Frontend không được:

- Tự coi mutation thành công.
    
- Tự overwrite Persisted State.
    
- Xóa Draft nếu user chưa yêu cầu.
    

---

# 30. Business Rule Ownership

|Rule|Owner|
|---|---|
|Required input UX|Frontend|
|Business Validation|Backend|
|Relationship Integrity|Backend + Database|
|Unique Constraint|Database|
|Assignment Rule|Backend|
|Transaction|Backend / Database|
|Rendering Style|Rendering Layer|
|Navigation|Frontend Router|
|Draft State|Frontend|

---

# 31. Phase 1 Business Rules

Phase 1 chỉ enforce các rule cần thiết để tạo Digital Twin hợp lệ:

1. Entity existence.
    
2. Parent-child relationship.
    
3. Physical dimensions.
    
4. Coordinate validity.
    
5. Owner Company.
    
6. Product uniqueness.
    
7. Active Product Assignment uniqueness.
    
8. Basic Assignment validation.
    
9. Archive behavior.
    
10. Persistence transaction integrity.
    

Không triển khai Optimization Rule trong Phase 1.

---

# 32. Business Rules chưa triển khai

Các Rule sau thuộc Future Extensions:

- ABC Classification
    
- XYZ Classification
    
- Shelf Utilization
    
- Capacity Optimization
    
- Empty Space Score
    
- Cross Selling
    
- Bundle Recommendation
    
- Margin Score
    
- Shelf Health Score
    
- Product Performance Rule
    
- Recommendation Rule
    
- AI Suggestion
    
- Auto Planogram Generation
    

Các Rule này không được hard-code vào Phase 1 Frontend.

---

# 33. Future Rule Engine Boundary

Khi Rule Engine được xây dựng:

```text
Persisted Business Data
↓
Rule Engine
↓
Rule Result / Recommendation
↓
API
↓
Frontend
```

Rule Engine không thay thế Database.

Rule Engine cũng không thay thế Rendering Engine.

---

# 34. Explainability Principle

Các Recommendation Rule trong tương lai phải có khả năng trả về:

- Rule ID
    
- Rule Name
    
- Input Data
    
- Result
    
- Reason / Explanation
    
- Confidence nếu phù hợp
    

Frontend chỉ hiển thị kết quả.

Không tự suy luận lý do từ visual output.

---

# 35. Tiêu chí hoàn thành

Part 08 hoàn thành khi:

- Phân biệt Frontend Validation và Backend Business Rule.
    
- Định nghĩa Resource Existence Rule.
    
- Định nghĩa Relationship Integrity.
    
- Định nghĩa Fixture Rules.
    
- Định nghĩa Surface Rules.
    
- Định nghĩa Display Position Rules.
    
- Định nghĩa Product Rules.
    
- Định nghĩa Product Assignment Rules.
    
- Định nghĩa Active Assignment Constraint.
    
- Định nghĩa Physical Measurement Rules.
    
- Định nghĩa Archive Rules.
    
- Định nghĩa Draft / Save / Persistence Rules.
    
- Định nghĩa Business Rule Ownership.
    
- Tách Business Rule khỏi Rendering Engine.
    
- Tạo boundary rõ ràng cho Future Rule Engine.