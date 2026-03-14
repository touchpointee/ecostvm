import { NextResponse } from "next/server";
import { connect, getConnectionStatus, getLastInitError } from "@/lib/whatsapp";

export async function POST() {
  try {
    console.log("[api/whatsapp/connect] POST received");
    await connect();

    // Wait up to 5 s for Chrome to either start generating a QR or fail fast,
    // so we can return a meaningful error instead of optimistically saying "success"
    // while initialization is silently crashing in the background.
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const status = getConnectionStatus();
      const err = getLastInitError();
      if (err) {
        console.error("[api/whatsapp/connect] init error:", err);
        return NextResponse.json({ error: err }, { status: 500 });
      }
      if (status === "connected") break; // already restored from session
    }

    console.log("[api/whatsapp/connect] connect() done, status:", getConnectionStatus());
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[api/whatsapp/connect]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to connect" },
      { status: 500 }
    );
  }
}
