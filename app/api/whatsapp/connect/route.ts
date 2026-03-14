import { NextResponse } from "next/server";
import { connect } from "@/lib/whatsapp";

export async function POST() {
  try {
    console.log("[api/whatsapp/connect] POST received");
    await connect();
    console.log("[api/whatsapp/connect] connect() done, status: connecting");
    return NextResponse.json({ success: true });
  } catch (e) {
    // Only reaches here for truly fatal startup errors (e.g. Chromium binary not found).
    // Transient errors (invalid session, browser lock) are handled by the background
    // reconnect logic in lib/whatsapp.ts and surfaced to the UI via the status API.
    console.error("[api/whatsapp/connect]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to connect" },
      { status: 500 }
    );
  }
}
