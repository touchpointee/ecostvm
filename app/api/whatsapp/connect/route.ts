import { NextResponse } from "next/server";
import { connect } from "@/lib/whatsapp";

export async function POST() {
  try {
    console.log("[api/whatsapp/connect] POST received");
    await connect();
    console.log("[api/whatsapp/connect] connect() done");
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[api/whatsapp/connect]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to connect" },
      { status: 500 }
    );
  }
}
