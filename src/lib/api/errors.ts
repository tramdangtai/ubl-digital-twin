/**
 * Error taxonomy cho Service/API layer.
 *
 * Route Handler bắt các error này và dịch sang Response envelope chuẩn
 * (Part 06 §14-15). Không bao giờ để lỗi Postgres thô (SQL, constraint nội
 * bộ, stack trace) lộ ra Frontend — xem TD-07 §78 (Error Information
 * Disclosure) và TD-05 §109 (Database Error Translation).
 */

export type FieldError = {
  field: string;
  code: string;
  message: string;
};

export class AppError extends Error {
  status: number;
  code: string;
  fieldErrors?: FieldError[];

  constructor(message: string, status: number, code: string, fieldErrors?: FieldError[]) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} không tồn tại.`, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = "CONFLICT") {
    super(message, 409, code);
  }
}

export class ValidationError extends AppError {
  constructor(fieldErrors: FieldError[], message = "Dữ liệu không hợp lệ") {
    super(message, 422, "VALIDATION_FAILED", fieldErrors);
  }
}

/** Postgres SQLSTATE — https://www.postgresql.org/docs/current/errcodes-appendix.html */
const PG_UNIQUE_VIOLATION = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";
const PG_CHECK_VIOLATION = "23514";

type PostgresJsError = Error & {
  code?: string;
  constraint_name?: string;
  column_name?: string;
  table_name?: string;
};

/**
 * Bảng ánh xạ tên constraint → field/message thân thiện. Mở rộng dần khi
 * thêm entity mới có unique constraint.
 */
const UNIQUE_CONSTRAINT_MESSAGES: Record<string, FieldError> = {
  uq_retailer_code: {
    field: "retailerCode",
    code: "DUPLICATE_VALUE",
    message: "Retailer Code đã tồn tại.",
  },
  uq_store_code: {
    field: "storeCode",
    code: "DUPLICATE_VALUE",
    message: "Store Code đã tồn tại.",
  },
  uq_fixture_code: {
    field: "fixtureCode",
    code: "DUPLICATE_VALUE",
    message: "Fixture Code đã tồn tại.",
  },
  uq_surface_active_orientation: {
    field: "orientation",
    code: "DUPLICATE_VALUE",
    message: "Fixture này đã có Surface Active với orientation này rồi.",
  },
  uq_product_item_code: {
    field: "itemCode",
    code: "DUPLICATE_VALUE",
    message: "Item Code đã tồn tại.",
  },
};

/**
 * Dịch lỗi Postgres thô sang AppError. Trả về null nếu không nhận diện được.
 *
 * Drizzle (postgres-js driver) bọc PostgresError gốc vào `err.cause` thay vì
 * để field `code` ở top-level — phải unwrap trước khi đọc `.code`.
 */
export function translatePostgresError(err: unknown): AppError | null {
  const candidate = err as PostgresJsError | undefined;
  const pgErr: PostgresJsError | undefined =
    candidate && typeof candidate.code === "string"
      ? candidate
      : ((candidate as { cause?: unknown })?.cause as PostgresJsError | undefined);

  if (!pgErr || typeof pgErr.code !== "string") return null;

  if (pgErr.code === PG_UNIQUE_VIOLATION) {
    const constraint = pgErr.constraint_name ?? "";
    const known = UNIQUE_CONSTRAINT_MESSAGES[constraint];
    const error = new ConflictError(known?.message ?? "Giá trị đã tồn tại, không được trùng lặp.", "DUPLICATE_VALUE");
    if (known) error.fieldErrors = [known];
    return error;
  }

  if (pgErr.code === PG_FOREIGN_KEY_VIOLATION) {
    return new AppError(
      "Tham chiếu tới bản ghi không tồn tại (dữ liệu cha đã bị archive hoặc không có thật).",
      422,
      "INVALID_REFERENCE"
    );
  }

  if (pgErr.code === PG_CHECK_VIOLATION) {
    return new ValidationError(
      [{ field: "unknown", code: "INVALID_VALUE", message: "Giá trị không thỏa điều kiện hợp lệ." }],
      "Dữ liệu không hợp lệ."
    );
  }

  return null;
}
