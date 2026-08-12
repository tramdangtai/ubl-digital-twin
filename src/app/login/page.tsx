"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setIsPending(false);
      setError(
        signInError.message === "Invalid login credentials"
          ? "Email hoặc mật khẩu không đúng."
          : signInError.message
      );
      return;
    }

    const next = searchParams.get("next") || "/digital-twin";
    router.replace(next);
    router.refresh();
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-ubl-primary">Uncel Bills</p>
        <h1 className="mt-2 text-2xl font-bold text-ubl-secondary">Digital Twin Platform</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-border bg-card p-6"
      >
        <h2 className="mb-4 font-semibold text-ubl-secondary">Đăng nhập</h2>

        {error && (
          <p className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        )}

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-muted">Email</span>
          <input
            type="email"
            required
            autoFocus
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-ubl-primary"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-medium text-muted">Mật khẩu</span>
          <input
            type="password"
            required
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-ubl-primary"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded bg-ubl-primary px-3 py-2 text-sm font-medium text-white hover:bg-ubl-primary-dark disabled:opacity-50"
        >
          {isPending ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        <p className="mt-4 text-center text-xs text-muted">
          Chưa có tài khoản? Liên hệ Admin để được cấp quyền truy cập.
        </p>
      </form>
    </main>
  );
}
