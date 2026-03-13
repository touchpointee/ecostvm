import { NextRequest, NextResponse } from "next/server";
import { listLogins, addLogin } from "@/lib/auth";

const ADMIN_COOKIE = "ecostvm_admin";

function requireAdmin(request: NextRequest): NextResponse | null {
  const adminCookie = request.cookies.get(ADMIN_COOKIE)?.value;
  if (adminCookie !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const numbers = await listLogins();
    return NextResponse.json({ numbers });
  } catch (e) {
    console.error("[api/logins GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list logins" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

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
    const result = await addLogin(number);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, number });
  } catch (e) {
    console.error("[api/logins POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to add login" },
      { status: 500 }
    );
  }
}
