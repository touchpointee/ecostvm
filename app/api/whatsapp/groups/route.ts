import { NextResponse } from "next/server";
import { fetchAllGroups } from "@/lib/whatsapp";

export async function POST() {
  try {
    const groups = await fetchAllGroups();
    const list = groups.map((g) => ({ id: g.id, subject: g.subject ?? "(no subject)" }));
    console.log("[EcoSport TVM] All group IDs:", list);
    return NextResponse.json({ groups: list });
  } catch (e) {
    console.error("[api/whatsapp/groups]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch groups" },
      { status: 500 }
    );
  }
}
