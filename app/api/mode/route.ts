import { NextResponse } from "next/server";
import { getConnectionStatus } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/mode
 * Returns { devMode: true } when WhatsApp is NOT connected.
 * The registration and feedback forms use this to gate submission.
 */
export async function GET() {
  const status = getConnectionStatus();
  const devMode = status !== "connected";
  return NextResponse.json(
    { devMode },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
