import { NextResponse } from "next/server";
import { getConnectionStatus, getLastInitError } from "@/lib/whatsapp";
import { getStoredQR } from "@/lib/whatsappQRStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const status = getConnectionStatus();
  const storedQr = await getStoredQR();
  const error = getLastInitError();

  return NextResponse.json(
    {
      status:
        status === "connected"
          ? "Connected"
          : status === "connecting" || storedQr
            ? "Connecting"
            : "Disconnected",
      ...(error ? { error } : {}),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
