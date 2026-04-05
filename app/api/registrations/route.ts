import { NextRequest, NextResponse } from "next/server";
import { listPendingRegistrations, countPendingRegistrations } from "@/lib/registrations";

const ADMIN_COOKIE = "ecostvm_admin";

function requireAdmin(request: NextRequest): NextResponse | null {
  if (request.cookies.get(ADMIN_COOKIE)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("count") === "1") {
      const count = await countPendingRegistrations();
      return NextResponse.json({ count });
    }
    const items = await listPendingRegistrations();
    return NextResponse.json({ items });
  } catch (e) {
    console.error("[api/registrations GET]", e);
    return NextResponse.json({ error: "Failed to load registrations" }, { status: 500 });
  }
}
