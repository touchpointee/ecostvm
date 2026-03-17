import { NextRequest, NextResponse } from "next/server";
import { sendBirthdayTestWish } from "@/lib/birthdays";
import { startBackgroundJobs } from "@/lib/backgroundJobs";

const ADMIN_COOKIE = "ecostvm_admin";

function requireAdmin(request: NextRequest): NextResponse | null {
  const adminCookie = request.cookies.get(ADMIN_COOKIE)?.value;
  if (adminCookie !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

startBackgroundJobs();

export async function POST(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Enter a name to test the birthday card." }, { status: 400 });
    }

    await sendBirthdayTestWish(name);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/birthdays/test]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send birthday test wish" },
      { status: 500 }
    );
  }
}
