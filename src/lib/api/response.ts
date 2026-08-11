import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError, translatePostgresError } from "./errors";

/** Envelope chuẩn theo Part 06 §14. */
export function apiSuccess<T>(data: T, message = "", status = 200) {
  return NextResponse.json({ success: true, data, message }, { status });
}

export function apiCreated<T>(data: T, message = "") {
  return apiSuccess(data, message, 201);
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Envelope cho list API có pagination (Product Library — quy mô ~4000 SKU,
 * offset pagination theo quyết định #10). Part 06 chưa định nghĩa Pagination
 * Envelope chính thức — đây là implement decision: thêm field `meta` bên
 * cạnh `data`, không phá cấu trúc envelope gốc.
 */
export function apiSuccessPaginated<T>(data: T[], meta: PaginationMeta, message = "") {
  return NextResponse.json({ success: true, data, message, meta }, { status: 200 });
}

/**
 * Bắt mọi error từ Service/Route Handler và dịch sang Response envelope
 * chuẩn. Không bao giờ trả stack trace / SQL / tên bảng cho Frontend
 * (TD-07 §78).
 */
export function apiError(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json(
      { success: false, message: err.message, errors: err.fieldErrors ?? [{ code: err.code }] },
      { status: err.status }
    );
  }

  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join(".") || "unknown",
      code: "INVALID_VALUE",
      message: issue.message,
    }));
    return NextResponse.json(
      { success: false, message: "Dữ liệu không hợp lệ", errors },
      { status: 422 }
    );
  }

  const translated = translatePostgresError(err);
  if (translated) {
    return NextResponse.json(
      {
        success: false,
        message: translated.message,
        errors: translated.fieldErrors ?? [{ code: translated.code }],
      },
      { status: translated.status }
    );
  }

  console.error("Unhandled API error:", err);
  return NextResponse.json(
    { success: false, message: "Đã xảy ra lỗi hệ thống.", errors: [{ code: "INTERNAL_ERROR" }] },
    { status: 500 }
  );
}
