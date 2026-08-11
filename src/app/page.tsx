import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-ubl-primary">
          Uncel Bills
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ubl-secondary">
          Digital Twin Platform
        </h1>
        <p className="mt-3 max-w-md text-muted">
          Nền tảng tái tạo không gian trưng bày cửa hàng dưới dạng số.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card px-6 py-4 text-sm text-muted">
        <p>
          <span className="font-medium text-foreground">Giai đoạn 1</span> — Nền tảng
          dự án đã sẵn sàng.
        </p>
        <p className="mt-1">
          Chạy{" "}
          <code className="rounded bg-muted-bg px-1.5 py-0.5 text-xs">npm install</code>{" "}
          rồi{" "}
          <code className="rounded bg-muted-bg px-1.5 py-0.5 text-xs">npm run dev</code>{" "}
          để khởi động.
        </p>
      </div>

      <Link
        href="/digital-twin"
        className="rounded-md bg-ubl-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ubl-primary-dark"
      >
        Vào Digital Twin →
      </Link>
    </main>
  );
}
