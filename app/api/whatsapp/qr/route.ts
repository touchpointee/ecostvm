import { NextResponse } from "next/server";
import { getCurrentQR, getConnectionStatus } from "@/lib/whatsapp";
import QRCode from "qrcode";

export async function GET() {
  const connectionStatus = getConnectionStatus();
  const qr = getCurrentQR();
  if (!qr) {
    const message =
      connectionStatus === "connecting"
        ? "QR not ready yet – keep waiting, it refreshes automatically."
        : "No QR. Click Connect WhatsApp first.";
    return NextResponse.json({ qr: null, message, connectionStatus });
  }
  try {
    const dataUrl = await QRCode.toDataURL(qr, { margin: 2, width: 280 });
    return NextResponse.json({ qr: dataUrl });
  } catch (e) {
    console.error("[api/whatsapp/qr]", e);
    return NextResponse.json({ qr: null, error: "Failed to generate QR image" }, { status: 500 });
  }
}
