"use client";

import Link from "next/link";
import { useState } from "react";

import { GeneralError, StatusBadge } from "@/components/digital-twin/inspector-shared";
import { useCurrentUser } from "@/lib/api/hooks/use-current-user";
import { useCreateUser, useUpdateUser, useUsers } from "@/lib/api/hooks/use-users";
import type { UserProfile, UserRole } from "@/lib/types/entities";

const ROLES: UserRole[] = ["Admin", "Editor", "Viewer"];

export default function UsersPage() {
  const { data: me, isLoading: meLoading } = useCurrentUser();

  if (meLoading) return null;

  if (me?.role !== "Admin") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-muted">Bạn không có quyền truy cập trang này (chỉ Admin).</p>
        <Link href="/digital-twin" className="text-ubl-primary hover:underline">
          ← Quay lại Digital Twin
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ubl-secondary">Quản lý Người dùng</h1>
          <p className="text-sm text-muted">Admin / Editor / Viewer — quyết định #1, CLAUDE.md</p>
        </div>
        <Link href="/digital-twin" className="text-sm text-ubl-primary hover:underline">
          ← Digital Twin
        </Link>
      </div>

      <CreateUserForm />
      <UserList />
    </main>
  );
}

function CreateUserForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("Editor");
  const [createdTempPassword, setCreatedTempPassword] = useState<string | null>(null);
  const { mutate, isPending, error, reset } = useCreateUser();

  const isValid = email.trim().length > 0 && password.length >= 8;

  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 font-semibold text-ubl-secondary">+ Thêm User</h2>
      <GeneralError error={error} />

      {createdTempPassword && (
        <p className="mb-3 rounded bg-green-50 px-3 py-2 text-xs text-green-700">
          Đã tạo tài khoản. Mật khẩu tạm: <code className="font-mono">{createdTempPassword}</code> —
          gửi cho người dùng qua kênh khác (Zalo/Slack...), họ nên đổi mật khẩu sau khi đăng nhập lần
          đầu.
        </p>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Email *</span>
          <input
            type="email"
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-ubl-primary"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Mật khẩu tạm *(≥ 8 ký tự)</span>
          <input
            type="text"
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-ubl-primary"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Họ tên (tuỳ chọn)</span>
          <input
            type="text"
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-ubl-primary"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Role</span>
          <select
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-ubl-primary"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        disabled={!isValid || isPending}
        onClick={() => {
          reset();
          setCreatedTempPassword(null);
          mutate(
            { email: email.trim(), password, fullName: fullName.trim() || undefined, role },
            {
              onSuccess: () => {
                setCreatedTempPassword(password);
                setEmail("");
                setPassword("");
                setFullName("");
                setRole("Editor");
              },
            }
          );
        }}
        className="rounded bg-ubl-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-ubl-primary-dark disabled:opacity-50"
      >
        {isPending ? "Đang tạo..." : "Tạo tài khoản"}
      </button>
    </div>
  );
}

function UserList() {
  const { data: users, isLoading } = useUsers(true);

  if (isLoading) return <p className="text-sm text-muted">Đang tải...</p>;
  if (!users || users.length === 0) return <p className="text-sm text-muted">Chưa có user nào.</p>;

  return (
    <div className="rounded-lg border border-border bg-card">
      {users.map((u) => (
        <UserRow key={u.userId} user={u} />
      ))}
    </div>
  );
}

function UserRow({ user }: { user: UserProfile }) {
  const { mutate, isPending, error } = useUpdateUser(user.userId);

  return (
    <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 text-sm last:border-b-0">
      <div>
        <p className="font-medium text-foreground">{user.email}</p>
        {user.fullName && <p className="text-xs text-muted">{user.fullName}</p>}
        <GeneralError error={error} />
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={user.status} />
        <select
          className="rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-ubl-primary"
          value={user.role}
          disabled={isPending || user.status === "Archived"}
          onChange={(e) =>
            mutate({ role: e.target.value as UserRole, expectedUpdatedAt: user.updatedAt })
          }
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {user.status === "Active" ? (
          <button
            disabled={isPending}
            onClick={() => {
              if (confirm(`Khoá tài khoản ${user.email}? Người này sẽ không đăng nhập được nữa.`)) {
                mutate({ status: "Archived", expectedUpdatedAt: user.updatedAt });
              }
            }}
            className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            Khoá
          </button>
        ) : (
          <button
            disabled={isPending}
            onClick={() => mutate({ status: "Active", expectedUpdatedAt: user.updatedAt })}
            className="rounded border border-green-200 px-2 py-1 text-xs text-green-700 hover:bg-green-50"
          >
            Mở khoá
          </button>
        )}
      </div>
    </div>
  );
}
