import { NextRequest, NextResponse } from "next/server";
import { ensureMemberIndexes, listMembers, upsertMember } from "@/lib/members";

const ADMIN_COOKIE = "ecostvm_admin";

function requireAdmin(request: NextRequest): NextResponse | null {
  const adminCookie = request.cookies.get(ADMIN_COOKIE)?.value;
  if (adminCookie !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    await ensureMemberIndexes();
    const { searchParams } = new URL(request.url);
    const items = await listMembers({
      q: searchParams.get("q") ?? "",
      name: searchParams.get("name") ?? "",
      membershipNumber: searchParams.get("membershipNumber") ?? "",
      contactNumber: searchParams.get("contactNumber") ?? "",
      vehicleNumber: searchParams.get("vehicleNumber") ?? "",
      vehicleColor: searchParams.get("vehicleColor") ?? "",
      place: searchParams.get("place") ?? "",
      address: searchParams.get("address") ?? "",
      bloodGroup: searchParams.get("bloodGroup") ?? "",
      dateOfBirth: searchParams.get("dateOfBirth") ?? "",
    });
    return NextResponse.json({ items });
  } catch (e) {
    console.error("[api/logins GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list members" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    await ensureMemberIndexes();
    const body = await request.json();
    const result = await upsertMember({
      name: body?.name,
      membershipNumber: body?.membershipNumber,
      contactNumber: body?.contactNumber ?? body?.number ?? body?.phoneNumber,
      vehicleColor: body?.vehicleColor,
      vehicleNumber: body?.vehicleNumber,
      place: body?.place,
      address: body?.address,
      bloodGroup: body?.bloodGroup,
      dateOfBirth: body?.dateOfBirth,
      source: "manual",
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, item: result.member });
  } catch (e) {
    console.error("[api/logins POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save member" },
      { status: 500 }
    );
  }
}
