import { NextResponse } from "next/server";
import { getConnectionStatus } from "@/lib/whatsapp";

export async function GET() {
  const status = getConnectionStatus();
  return NextResponse.json({
    status: status === "connected" ? "Connected" : status === "connecting" ? "Connecting" : "Disconnected",
  });
}
