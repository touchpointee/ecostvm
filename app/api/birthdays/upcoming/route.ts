import { NextRequest, NextResponse } from "next/server";
import { listUpcomingBirthdays } from "@/lib/birthdays";
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

export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get("limit") ?? "50");
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;
    const items = await listUpcomingBirthdays(limit);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[api/birthdays/upcoming]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load upcoming birthdays" },
      { status: 500 }
    );
  }
}
