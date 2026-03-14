import { NextResponse } from "next/server";
import { getCurrentQR, getConnectionStatus } from "@/lib/whatsapp";
import { getStoredQR } from "@/lib/whatsappQRStore";
import QRCode from "qrcode";

export async function GET() {
  const connectionStatus = getConnectionStatus();
  const qr = getCurrentQR() ?? (await getStoredQR());
  if (!qr) {
    const message =
      connectionStatus === "connecting"
        ? "QR not ready yet. Keep waiting or refresh."
        : "No QR code. Click Connect WhatsApp first; if you already did, click Remove all connections then Connect again.";
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
