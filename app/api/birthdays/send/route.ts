import { NextRequest, NextResponse } from "next/server";
import { sendBirthdayWishes } from "@/lib/birthdays";
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
    const result = await sendBirthdayWishes();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[api/birthdays/send]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send birthday wishes" },
      { status: 500 }
    );
  }
}
