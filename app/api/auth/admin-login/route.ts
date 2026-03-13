import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "ecostvm_admin";
const ADMIN_NUMBER = "1234567890";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const raw = body?.number ?? body?.phoneNumber ?? "";
    const digits = String(raw).replace(/\D/g, "").trim();

    if (digits !== ADMIN_NUMBER) {
      return NextResponse.json(
        { error: "Invalid admin number." },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set(ADMIN_COOKIE, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
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

