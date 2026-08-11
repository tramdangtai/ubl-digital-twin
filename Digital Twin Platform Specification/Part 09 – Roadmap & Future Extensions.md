Version: 0.2 (Working > Perfect)

# 1. Mục tiêu

Định nghĩa hướng phát triển của Digital Twin Platform sau Phase 1.

Roadmap mô tả:

- Feature Evolution.
    
- Data Evolution.
    
- Business Rule Evolution.
    
- Rendering Evolution.
    
- Analytics Evolution.
    
- Recommendation / AI Evolution.
    

Roadmap không thay đổi các nguyên tắc nền tảng đã định nghĩa ở Part 01–08.

Mọi Extension trong tương lai phải tiếp tục tuân thủ:

```text
User Interaction
↓
Frontend State / Draft
↓
API
↓
Backend Validation
↓
Database
↓
Persisted State
↓
Rendering
```

---

# 2. Architectural Principles for Future Extensions

## 2.1 Không phá vỡ Source of Truth

Database vẫn là Source of Truth đối với Persisted Business Data.

Không tạo một hệ thống AI hoặc UI khác làm Source of Truth song song.

---

## 2.2 Không bypass API

Future Feature không được:

```text
Frontend
↓
Database
```

trực tiếp.

Vẫn:

```text
Frontend
↓
API
↓
Backend
↓
Database
```

---

## 2.3 Không đưa Business Rule vào UI

UI có thể:

- Hiển thị Recommendation.
    
- Hiển thị Score.
    
- Hiển thị Explanation.
    
- Cho phép User Accept / Reject.
    

Nhưng không tự quyết định Business Rule.

---

## 2.4 AI không tự động ghi dữ liệu

AI có thể:

```text
Analyze
↓
Recommend
↓
Explain
```

nhưng không tự ý:

```text
AI
↓
Database Mutation
```

Nếu User chấp nhận Recommendation:

```text
Recommendation
↓
User Accept
↓
Draft / Proposed Change
↓
API
↓
Backend Validation
↓
Database
```

---

# 3. Phase 1 — Foundation

## Objective

Xây dựng Digital Twin Foundation.

### Business Objects

- Retailer
    
- Store
    
- Fixture
    
- Surface
    
- Display Position
    
- Product
    
- Product Assignment
    

### User Capabilities

- Browse Retailer / Store / Fixture.
    
- Create Fixture.
    
- Edit Fixture.
    
- Move Fixture.
    
- Resize Fixture.
    
- Rotate Fixture.
    
- Create Surface.
    
- Create Display Position.
    
- Select Product.
    
- Create Product Assignment.
    
- Save / Cancel Draft.
    
- Render Digital Twin.
    

### Platform Capabilities

- REST API.
    
- Supabase PostgreSQL.
    
- Hybrid URL + UI State.
    
- Draft State.
    
- Rendering Engine.
    
- Business Rule Layer.
    

### Phase 1 Outcome

Người dùng có thể tạo và duy trì một Digital Twin có cấu trúc:

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

# 4. Phase 2 — Planogram Management

Phase 2 mở rộng khả năng quản lý Planogram.

## Candidate Features

- Advanced Drag & Drop.
    
- Snap to Grid.
    
- Alignment.
    
- Multi-select.
    
- Copy / Paste.
    
- Duplicate Layout.
    
- Duplicate Fixture.
    
- Layout Templates.
    
- Fixture Templates.
    
- Import / Export.
    
- Planogram Version.
    
- Version History.
    
- Version Comparison.
    
- Undo / Redo.
    

### Important

Basic Move / Resize / Rotate đã thuộc Phase 1.

Phase 2 tập trung vào:

> **Advanced authoring and layout management**

chứ không lặp lại Basic Fixture Editing.

---

# 5. Phase 3 — Analytics

Digital Twin được kết nối với Business / Sales Data.

## Candidate Features

### Product Performance

- Sales Quantity.
    
- Revenue.
    
- Margin.
    
- Inventory.
    
- Inventory Turnover.
    

### Planogram Analytics

- Shelf Utilization.
    
- Space Utilization.
    
- Empty Space.
    
- Facing Utilization.
    
- Product Productivity.
    
- Fixture Productivity.
    

### Classification

- ABC Classification.
    
- XYZ Classification.
    
- Pareto Analysis.
    

### Visualization

- Sales Overlay.
    
- Product Performance Overlay.
    
- Heatmap.
    
- Dashboard.
    

Analytics Layer phải đọc Persisted Business Data và Analytical Data.

Analytics không trực tiếp thay đổi Planogram.

---

# 6. Phase 4 — Business Rule Engine

Xây dựng Rule Engine độc lập với UI.

## Candidate Rules

- Shelf Health.
    
- Facing Recommendation.
    
- Space Allocation.
    
- Cross Selling.
    
- Bundle Recommendation.
    
- Product Placement Rule.
    
- Margin Score.
    
- Product Performance Rule.
    

---

# 7. Rule Engine Architecture

```text
Persisted Data
↓
Rule Engine
↓
Rule Evaluation
↓
Rule Result
↓
API
↓
Frontend
```

Rule Engine không phụ thuộc React.

Rule Engine không phụ thuộc Rendering Engine.

---

# 8. Rule Result

Một Rule Result nên có cấu trúc có thể giải thích.

Ví dụ:

```text
Rule ID
Rule Name
Target Object
Input Data
Result
Reason
Priority
```

Ví dụ:

```text
Rule:
Low Shelf Productivity

Target:
Fixture F001

Result:
Review Fixture

Reason:
Revenue per Display Position is below threshold.
```

Frontend chỉ hiển thị kết quả.

---

# 9. Phase 5 — Recommendation & AI

AI được thêm vào sau khi:

- Data Model ổn định.
    
- Digital Twin đủ dữ liệu.
    
- Analytics đủ dữ liệu.
    
- Rule Engine đủ rõ.
    
- Business Rules có thể giải thích.
    

## Candidate Features

- AI Recommendation.
    
- Auto Planogram Proposal.
    
- Product Placement Suggestion.
    
- Bundle Suggestion.
    
- Cross Selling Suggestion.
    
- Layout Improvement Suggestion.
    
- Natural Language Query.
    
- Natural Language Planogram Assistant.
    

---

# 10. AI Recommendation Lifecycle

AI không trực tiếp mutate Database.

Lifecycle:

```text
Persisted Digital Twin
↓
Analytics / Rule Engine / AI
↓
Recommendation
↓
User Review
↓
Accept
↓
Draft / Proposed State
↓
API
↓
Backend Validation
↓
Database
↓
Persisted State
↓
Rendering
```

---

# 11. Proposed State

Khi AI đề xuất thay đổi lớn, hệ thống có thể giới thiệu một State mới:

```text
Persisted State
↓
Proposed State
↓
User Review
↓
Accept / Reject
```

Proposed State không được coi là Persisted Business State cho đến khi User xác nhận và Backend persistence thành công.

Chi tiết Proposed State / Scenario Model sẽ được định nghĩa trong một Future Specification khi feature này thực sự được triển khai.

---

# 12. Phase 6 — Scenario & What-if Simulation

Sau khi Recommendation Engine đủ trưởng thành:

## Candidate Features

- What-if Simulation.
    
- Scenario Comparison.
    
- Before / After.
    
- Revenue Impact Estimate.
    
- Space Impact Estimate.
    
- Capacity Impact.
    
- Product Mix Simulation.
    

Ví dụ:

```text
Current Planogram
        │
        ├──────────────┐
        ▼              ▼
Scenario A        Scenario B
        │              │
        ▼              ▼
Analytics        Analytics
        │              │
        └──────┬───────┘
               ▼
        User Comparison
```

Scenario không tự động trở thành Production Planogram.

---

# 13. Versioning

Future Versioning có thể áp dụng cho:

- Store Layout.
    
- Fixture Layout.
    
- Planogram.
    
- Product Assignment.
    
- Scenario.
    

Versioning phải giữ nguyên nguyên tắc:

```text
Version
↓
Persisted Data
```

và không làm mất lịch sử khi User thực hiện thay đổi.

---

# 14. Audit Trail

Future system có thể lưu:

- Who.
    
- What.
    
- When.
    
- Before.
    
- After.
    
- Reason.
    
- Source.
    

Ví dụ:

```text
User:
John

Action:
Update Fixture

Before:
Width = 1800

After:
Width = 2000

Timestamp:
...

Source:
Manual Edit
```

AI-generated change cũng phải có Source rõ ràng:

```text
Source = AI Recommendation
```

---

# 15. Collaboration

Future system có thể hỗ trợ nhiều user cùng làm việc.

Candidate Features:

- User Presence.
    
- Concurrent Editing.
    
- Locking.
    
- Conflict Detection.
    
- Conflict Resolution.
    
- Comments.
    
- Approval Workflow.
    

Conflict handling phải dựa trên Persisted State và API Contract.

Không giải quyết conflict bằng cách đơn giản ghi đè Database từ Frontend.

---

# 16. Approval Workflow

Future Planogram có thể có lifecycle:

```text
Draft
↓
Review
↓
Approved
↓
Published
↓
Archived
```

Approval State là Business State và phải được định nghĩa trong Data Model khi feature này được triển khai.

---

# 17. External Data Integration

Future system có thể tích hợp:

- ERP.
    
- POS.
    
- Inventory.
    
- Product Master.
    
- Retailer Data.
    
- Sales Data.
    

Integration phải đi qua Data Integration Layer.

Không đưa External System Logic trực tiếp vào React.

---

# 18. Product Information Expansion

Product Library có thể mở rộng:

- Product Images.
    
- Dimensions.
    
- Weight.
    
- Packaging.
    
- Category Hierarchy.
    
- Brand.
    
- Supplier.
    
- Pricing.
    
- Margin.
    
- Product Attributes.
    

Product Data phải tiếp tục được quản lý như Business Data.

---

# 19. Rendering Engine Evolution

Rendering Engine có thể mở rộng:

### Phase 1

- 2D Fixture.
    
- Surface.
    
- Display Position.
    
- Product.
    
- Scale.
    
- Zoom.
    
- Pan.
    

### Future

- Advanced 2D Planogram.
    
- Snap.
    
- Alignment.
    
- Measurement.
    
- Collision Visualization.
    
- Capacity Visualization.
    
- Heatmap.
    
- 3D Preview.
    

Rendering Engine vẫn không chứa Business Rule.

---

# 20. Data Architecture Evolution

Future Data Architecture có thể mở rộng từ:

```text
Operational Data
```

sang:

```text
Operational Data
+
Analytical Data
+
Recommendation Data
+
Scenario Data
+
Audit Data
```

Nhưng các lớp này phải có ownership rõ ràng.

Không tạo duplicate Business Data chỉ để phục vụ UI.

---

# 21. Long-term Platform Architecture

Kiến trúc dài hạn:

```text
                    ┌──────────────────┐
                    │   User / UI      │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Frontend / State │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │    REST API      │
                    └────────┬─────────┘
                             │
             ┌───────────────┼────────────────┐
             │               │                │
             ▼               ▼                ▼
        Business        Analytics        Recommendation
         Service           Layer              Layer
             │               │                │
             └───────────────┼────────────────┘
                             ▼
                    ┌──────────────────┐
                    │   Data Layer     │
                    │   PostgreSQL     │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Rendering Engine │
                    └──────────────────┘
```

Rendering Engine là Presentation concern.

Business Rule / Analytics / Recommendation là Decision concern.

Không nối chúng thành một chuỗi phụ thuộc cứng:

```text
Rendering
↓
Business Rule
```

---

# 22. Architectural Separation

Future architecture phải duy trì các boundary:

|Layer|Responsibility|
|---|---|
|Frontend|Interaction / UI State / Draft|
|Router|Resource Context|
|API|Communication Contract|
|Backend Service|Business Logic|
|Database|Persistence / Integrity|
|Analytics|Measurement / Analysis|
|Rule Engine|Deterministic Decision Rules|
|Recommendation|Proposed Decisions|
|AI|Intelligent Assistance|
|Rendering|Visual Representation|

---

# 23. Future Feature Principle

Mỗi Feature mới phải trả lời được:

1. Đây là Business Object hay UI State?
    
2. Nếu Business Object, nó lưu ở đâu?
    
3. Nếu UI State, tại sao cần persistence?
    
4. API nào sở hữu operation?
    
5. Business Rule nằm ở đâu?
    
6. Rendering Engine chỉ render hay có thêm responsibility?
    
7. Feature có cần URL Context không?
    
8. Feature có cần Draft State không?
    
9. Feature có cần Versioning không?
    
10. Feature có ảnh hưởng Database Schema không?
    

Nếu chưa trả lời được các câu hỏi này, không bắt đầu implementation.

---

# 24. No Premature Architecture

Không xây trước:

- AI Engine.
    
- Recommendation Engine.
    
- Optimization Engine.
    
- Versioning System.
    
- Collaboration System.
    

khi Foundation chưa đủ ổn định.

Ưu tiên:

```text
Foundation
↓
Data Quality
↓
Digital Twin
↓
Analytics
↓
Rules
↓
Recommendation
↓
AI
↓
Optimization
```

---

# 25. Working > Perfect

Mỗi Phase phải:

- Chạy được.
    
- Test được.
    
- Demo được.
    
- Có giá trị thực tế.
    
- Có thể mở rộng.
    

Không thiết kế Future Feature quá mức nếu chưa có requirement thực tế.

---

# 26. Backward Compatibility

Future Extension không được phá vỡ:

- Existing Business Object.
    
- Existing API Contract.
    
- Existing Database Integrity.
    
- Existing Resource Identity.
    
- Existing URL Contract.
    

Nếu breaking change cần thiết:

```text
Version
↓
Migration
↓
API Versioning nếu cần
↓
Controlled Transition
```

Không âm thầm thay đổi Contract.

---

# 27. Migration Principle

Khi Data Model cần thay đổi:

```text
Current Schema
↓
Migration Plan
↓
Database Migration
↓
API Update
↓
Frontend Update
```

Không chỉnh Database thủ công mà không có Migration Strategy.

---

# 28. Phase Completion Strategy

Mỗi Phase phải có:

- Scope.
    
- Business Objective.
    
- Data Requirement.
    
- UI Requirement.
    
- API Requirement.
    
- Business Rule Requirement.
    
- Acceptance Criteria.
    

Không xem một Phase là hoàn thành chỉ vì UI đã render được.

---

# 29. Suggested Long-term Sequence

```text
Phase 1
Digital Twin Foundation
        ↓
Phase 2
Planogram Authoring
        ↓
Phase 3
Analytics
        ↓
Phase 4
Business Rule Engine
        ↓
Phase 5
Recommendation / AI
        ↓
Phase 6
Scenario / Optimization
        ↓
Phase 7
Collaboration / Governance
```

Các Phase có thể thay đổi tùy Business Priority.

---

# 30. Long-term Vision

Digital Twin Platform trở thành nền tảng trung tâm cho:

- Digital Store Representation.
    
- Planogram Management.
    
- Merchandising.
    
- Product Information.
    
- Retail Analytics.
    
- Business Rule Engine.
    
- Recommendation.
    
- AI Decision Support.
    
- Scenario Simulation.
    
- Planogram Optimization.
    

Mục tiêu cuối cùng không phải chỉ là:

> "Vẽ được một cái kệ."

Mà là xây dựng một hệ thống trong đó:

```text
Physical Retail World
        ↓
Digital Twin
        ↓
Data
        ↓
Analytics
        ↓
Rules
        ↓
Recommendations
        ↓
Human Decision
        ↓
Persisted Planogram
        ↓
Physical Retail World
```

User vẫn là người quyết định cuối cùng đối với những thay đổi có tác động nghiệp vụ.

---

# 31. Specification Evolution

Bộ Specification hiện tại:

```text
Part 01 – Vision / Principles
Part 02 – Business Objects / Data Model
Part 03 – Database Schema
Part 04 – UI / UX
Part 05 – Interaction / State Management
Part 06 – API Contract
Part 07 – Rendering Engine
Part 08 – Business Rules
Part 09 – Roadmap / Future Extensions
```

được xem là:

**Specification v0.2 – Working > Perfect**

Sau khi Foundation implementation hoàn thành, hệ thống cần được review lại dựa trên:

- Actual implementation.
    
- Actual user workflow.
    
- Actual data.
    
- API behavior.
    
- Performance.
    
- Business feedback.
    

Sau đó mới nâng lên:

**Specification v1.0**

---

# 32. Điều kiện hoàn thành bộ Specification

Bộ Specification được coi là đủ để bắt đầu Foundation Implementation khi:

- Business Objects đã được định nghĩa.
    
- Database Schema đã được định nghĩa.
    
- UI / UX đã được định nghĩa.
    
- Draft / Persisted State đã được định nghĩa.
    
- URL / Resource Context đã được định nghĩa.
    
- API Contract đã được định nghĩa.
    
- Rendering Engine boundary đã được định nghĩa.
    
- Business Rules nền tảng đã được định nghĩa.
    
- Future Extension boundary đã được định nghĩa.
    

Từ đây có thể chuyển sang Implementation Planning.

---

# 33. Kết luận

Digital Twin Platform được xây dựng theo nguyên tắc:

```text
User
↓
Interaction
↓
Draft
↓
API
↓
Validation
↓
Persistence
↓
Rendering
```

và mở rộng dần:

```text
Digital Twin
↓
Analytics
↓
Business Rules
↓
Recommendation
↓
AI
↓
Optimization
```

Mỗi lớp có trách nhiệm riêng.

Không để UI trở thành Business Engine.

Không để Rendering Engine trở thành Business Engine.

Không để AI trở thành Database Writer.

Và không để Future Features phá vỡ Foundation đã được xây dựng.