import { NextResponse } from "next/server";
import { getConnectionStatus, getLastInitError } from "@/lib/whatsapp";
import { getStoredQR } from "@/lib/whatsappQRStore";

export async function GET() {
  const status = getConnectionStatus();
  const storedQr = await getStoredQR();
  const error = getLastInitError();

  return NextResponse.json({
    status:
      status === "connected"
        ? "Connected"
        : status === "connecting" || storedQr
          ? "Connecting"
          : "Disconnected",
    ...(error ? { error } : {}),
  });
}
