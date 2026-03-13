import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "ecostvm_admin";
const USER_COOKIE = "ecostvm_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin routes with dedicated admin cookie
  if (pathname.startsWith("/admin")) {
    const adminCookie = request.cookies.get(ADMIN_COOKIE)?.value;

    // If already logged in and visiting /admin/login, send to /admin dashboard
    if (pathname === "/admin/login" && adminCookie === "1") {
      const url = new URL("/admin", request.url);
      return NextResponse.redirect(url);
    }

    // For all other /admin routes, require admin cookie, except the login page
    if (pathname !== "/admin/login" && adminCookie !== "1") {
      const url = new URL("/admin/login", request.url);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // Protect the public feedback form at `/` using the user session cookie.
  // Only numbers added in the portal Logins list can obtain this cookie
  // via /api/auth/login, so only they can access the form.
  if (pathname === "/") {
    const userCookie = request.cookies.get(USER_COOKIE)?.value;
    if (!userCookie) {
      const url = new URL("/login", request.url);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/"],
};

 