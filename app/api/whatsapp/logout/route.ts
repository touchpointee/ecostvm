import { NextResponse } from "next/server";
import { logout } from "@/lib/whatsapp";

export async function POST() {
  try {
    await logout();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[api/whatsapp/logout]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to logout" },
      { status: 500 }
    );
  }
}

