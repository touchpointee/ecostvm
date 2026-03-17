import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMemberByPhoneNumber } from "@/lib/members";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const member = await getMemberByPhoneNumber(session.phoneNumber);
    return NextResponse.json({
      phoneNumber: session.phoneNumber,
      member: member
        ? {
            name: member.name,
            contactNumber: member.contactNumber,
            vehicleNumber: member.vehicleNumber,
          }
        : null,
    });
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
}
