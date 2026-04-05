import { NextResponse } from "next/server";
import { getNextMembershipNumber } from "@/lib/members";

export async function GET() {
  try {
    const next = await getNextMembershipNumber();
    return NextResponse.json({ next });
  } catch (e) {
    console.error("[api/next-membership GET]", e);
    return NextResponse.json({ error: "Failed to get membership number" }, { status: 500 });
  }
}
