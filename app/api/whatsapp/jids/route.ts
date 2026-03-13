import { NextRequest, NextResponse } from "next/server";
import { getJids, saveJids } from "@/lib/jids";

export async function GET() {
  const jids = await getJids();
  return NextResponse.json(jids);
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { appreciationGroupJid, escalationGroupJid } = body;
    const updates: { appreciationGroupJid?: string; escalationGroupJid?: string } = {};
    if (typeof appreciationGroupJid === "string") updates.appreciationGroupJid = appreciationGroupJid;
    if (typeof escalationGroupJid === "string") updates.escalationGroupJid = escalationGroupJid;
    const jids = await saveJids(updates);
    return NextResponse.json(jids);
  } catch (e) {
    console.error("[api/whatsapp/jids]", e);
    return NextResponse.json({ error: "Failed to save JIDs" }, { status: 500 });
  }
}
