import { createServerClient } from "@supabase/ssr";
import type { SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth gate (Giai đoạn 6) — chặn request chưa đăng nhập ở edge, trước khi vào
 * Route Handler/Page. Đây là lớp "authentication" (có đăng nhập hay không);
 * lớp "authorization" (role Admin/Editor/Viewer làm được gì) nằm ở
 * `src/lib/auth/guard.ts`, gọi trong từng Route Handler — middleware không
 * biết action cụ thể của route nên không thể quyết role ở đây.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: Parameters<SetAllCookies>[0]) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/login";
  const isApiRoute = pathname.startsWith("/api");

  if (!user && !isLoginRoute) {
    if (isApiRoute) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập.", errors: [{ code: "UNAUTHENTICATED" }] },
        { status: 401 }
      );
    }
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLoginRoute) {
    return NextResponse.redirect(new URL("/digital-twin", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
