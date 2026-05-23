import { NextRequest, NextResponse } from "next/server";
import { logout, logDisconnection } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const location = body?.location ?? null;

    // Retrieve IP address from request headers or environment
    const ip =
      request.ip ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Retrieve User-Agent
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Retrieve Admin cookie verification
    const adminCookie = request.cookies.get("ecostvm_admin")?.value;
    const isAuthorized = adminCookie === "1";

    const logEntry = {
      timestamp: new Date(),
      type: "manual",
      action: "Disconnect Button Clicked",
      ip,
      userAgent,
      adminAuthorized: isAuthorized,
      location,
    };

    // Log the user's manual disconnect command with device / location details
    await logDisconnection(logEntry);

    // Call internal Baileys session cleanup
    await logout();

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[api/whatsapp/logout]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to logout" },
      { status: 500 }
    );
  }
}

