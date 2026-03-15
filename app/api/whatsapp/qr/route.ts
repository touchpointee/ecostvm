import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getConnectionStatus, getCurrentQR } from "@/lib/whatsapp";
import { getStoredQR } from "@/lib/whatsappQRStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const connectionStatus = getConnectionStatus();
  const qr = getCurrentQR() ?? (await getStoredQR());

  if (!qr) {
    const message =
      connectionStatus === "connecting"
        ? "QR not ready yet - keep waiting, it refreshes automatically."
        : "No QR. Click Connect WhatsApp first.";
    return NextResponse.json(
      { qr: null, message, connectionStatus },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }

  try {
    const dataUrl = await QRCode.toDataURL(qr, { margin: 2, width: 280 });
    return NextResponse.json(
      { qr: dataUrl, connectionStatus: "connecting" },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (e) {
    console.error("[api/whatsapp/qr]", e);
    return NextResponse.json({ qr: null, error: "Failed to generate QR image" }, { status: 500 });
  }
}
