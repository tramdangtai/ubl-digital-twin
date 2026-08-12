/**
 * API Client tập trung — TD-02 §47-48. Mọi Component gọi API phải đi qua
 * đây, không tự fetch()/axios() rải rác.
 */

export type ApiFieldError = { field?: string; code: string; message?: string };
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}
type ApiEnvelope<T> =
  | { success: true; data: T; message: string; meta?: PaginationMeta }
  | { success: false; message: string; errors: ApiFieldError[] };

export class ApiRequestError extends Error {
  status: number;
  errors: ApiFieldError[];

  constructor(message: string, status: number, errors: ApiFieldError[]) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.errors = errors;
  }
}

async function requestEnvelope<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T> & { success: true }> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  const body = (await res.json()) as ApiEnvelope<T>;

  if (!body.success) {
    throw new ApiRequestError(body.message, res.status, body.errors);
  }
  return body;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const body = await requestEnvelope<T>(path, init);
  return body.data;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  /** Dùng cho list API có pagination — trả cả `data` và `meta` (page/pageSize/total). */
  getWithMeta: async <T>(path: string): Promise<{ data: T; meta: PaginationMeta }> => {
    const body = await requestEnvelope<T>(path);
    return { data: body.data, meta: body.meta ?? { page: 1, pageSize: 0, total: 0 } };
  },
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  /**
   * Giai đoạn 9 — upload file qua FormData.
   * KHÔNG set Content-Type header thủ công — browser phải tự set
   * "multipart/form-data; boundary=..." khi body là FormData.
   */
  postForm: async <T>(path: string, form: FormData): Promise<T> => {
    // fetch trực tiếp (không qua requestEnvelope) để tránh override Content-Type.
    const res = await fetch(path, { method: "POST", body: form });
    const body = (await res.json()) as ApiEnvelope<T>;
    if (!body.success) {
      throw new ApiRequestError(body.message, res.status, body.errors);
    }
    return body.data;
  },
};
