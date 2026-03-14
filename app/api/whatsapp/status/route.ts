import { NextResponse } from "next/server";
import { getConnectionStatus, getLastInitError } from "@/lib/whatsapp";

export async function GET() {
  const status = getConnectionStatus();
  const error = getLastInitError();
  return NextResponse.json({
    status: status === "connected" ? "Connected" : status === "connecting" ? "Connecting" : "Disconnected",
    ...(error ? { error } : {}),
  });
}
