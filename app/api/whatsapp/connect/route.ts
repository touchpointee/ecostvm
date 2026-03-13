import { NextResponse } from "next/server";
import { connect } from "@/lib/whatsapp";

export async function POST() {
  try {
    await connect();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[api/whatsapp/connect]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to connect" },
      { status: 500 }
    );
  }
}
