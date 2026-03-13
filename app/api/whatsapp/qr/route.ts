import { NextResponse } from "next/server";
import { getCurrentQR } from "@/lib/whatsapp";
import QRCode from "qrcode";

export async function GET() {
  const qr = getCurrentQR();
  if (!qr) {
    return NextResponse.json({ qr: null, message: "No QR code available. Connection may already be open or disconnected." });
  }
  try {
    const dataUrl = await QRCode.toDataURL(qr, { margin: 2, width: 280 });
    return NextResponse.json({ qr: dataUrl });
  } catch (e) {
    console.error("[api/whatsapp/qr]", e);
    return NextResponse.json({ qr: null, error: "Failed to generate QR image" }, { status: 500 });
  }
}
