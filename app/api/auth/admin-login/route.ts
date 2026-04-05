import { NextRequest, NextResponse } from "next/server";
import { verifyAdminLogin } from "@/lib/settings";

const ADMIN_COOKIE = "ecostvm_admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body?.username ?? "").trim();
    const password = String(body?.password ?? "").trim();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Enter username and password." },
        { status: 400 }
      );
    }

    const valid = await verifyAdminLogin(username, password);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set(ADMIN_COOKIE, "1", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  } catch (e) {
    console.error("[api/auth/admin-login]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Admin login failed" },
      { status: 500 }
    );
  }
}
