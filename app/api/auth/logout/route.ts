import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

const ADMIN_COOKIE = "ecostvm_admin";

export async function POST() {
  const res = NextResponse.json({ success: true });
  // Clear user session cookie
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  // Clear admin session cookie
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}
