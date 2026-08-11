/**
 * API Client tập trung — TD-02 §47-48. Mọi Component gọi API phải đi qua
 * đây, không tự fetch()/axios() rải rác.
 */

export type ApiFieldError = { field?: string; code: string; message?: string };
type ApiEnvelope<T> =
  | { success: true; data: T; message: string }
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  const body = (await res.json()) as ApiEnvelope<T>;

  if (!body.success) {
    throw new ApiRequestError(body.message, res.status, body.errors);
  }
  return body.data;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
};
