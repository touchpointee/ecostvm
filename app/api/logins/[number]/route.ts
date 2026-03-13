import { NextRequest, NextResponse } from "next/server";
import { removeLogin } from "@/lib/auth";

const ADMIN_COOKIE = "ecostvm_admin";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ number: string }> | { number: string } }
) {
  try {
    const adminCookie = request.cookies.get(ADMIN_COOKIE)?.value;
    if (adminCookie !== "1") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await Promise.resolve(context.params);
    const number = String(params.number).replace(/\D/g, "").trim();
    if (!number) {
      return NextResponse.json({ error: "Invalid number" }, { status: 400 });
    }

    const result = await removeLogin(number);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[api/logins DELETE]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to remove login" },
      { status: 500 }
    );
  }
}
