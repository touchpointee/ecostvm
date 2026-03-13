import { NextRequest, NextResponse } from "next/server";
import {
  isAllowedNumber,
  addLogin,
  listLogins,
  createSessionCookie,
  COOKIE_NAME,
  MAX_AGE,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const raw = body?.number ?? body?.phoneNumber ?? "";
    const number = String(raw).replace(/\D/g, "").trim();
    if (!number || number.length < 10) {
      return NextResponse.json(
        { error: "Enter a valid phone number (at least 10 digits)." },
        { status: 400 }
      );
    }

    const allowed = await isAllowedNumber(number);
    const logins = await listLogins();

    // First user: no logins yet → add this number and log in
    if (logins.length === 0) {
      await addLogin(number);
      const cookie = createSessionCookie(number);
      const res = NextResponse.json({ success: true });
      res.cookies.set(COOKIE_NAME, cookie, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: MAX_AGE,
        path: "/",
      });
      return res;
    }

    if (!allowed) {
      return NextResponse.json(
        { error: "This number is not registered. Contact admin to get access." },
        { status: 401 }
      );
    }

    const cookie = createSessionCookie(number);
    const res = NextResponse.json({ success: true });
    res.cookies.set(COOKIE_NAME, cookie, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: MAX_AGE,
      path: "/",
    });
    return res;
  } catch (e) {
    console.error("[api/auth/login]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Login failed" },
      { status: 500 }
    );
  }
}
