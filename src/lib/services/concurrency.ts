import { ConflictError } from "../api/errors";

/**
 * Optimistic concurrency (CLAUDE.md quyết định #9): 2-5 user có thể sửa đồng
 * thời trên cùng 1 Store. Client gửi kèm `updatedAt` đã tải lúc mở Inspector;
 * nếu khác với giá trị hiện tại trong DB nghĩa là người khác đã ghi đè sau đó
 * -> từ chối bằng 409 thay vì lặng lẽ ghi đè lên thay đổi của người kia.
 *
 * Không dùng cột `version` riêng — so sánh trực tiếp `updated_at` là đủ cho
 * quy mô 2-5 user đồng thời (không cần optimistic-lock library).
 */
export function assertNotStale(expectedUpdatedAt: string | undefined, actualUpdatedAt: Date) {
  if (!expectedUpdatedAt) return;
  if (new Date(expectedUpdatedAt).getTime() !== actualUpdatedAt.getTime()) {
    throw new ConflictError(
      "Dữ liệu đã bị người khác thay đổi kể từ lúc bạn tải trang này. Vui lòng tải lại và thử lại.",
      "STALE_UPDATE"
    );
  }
}
