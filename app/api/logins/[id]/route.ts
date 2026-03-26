import { NextRequest, NextResponse } from "next/server";
import { deleteMemberById, updateMemberBlockStatus } from "@/lib/members";

const ADMIN_COOKIE = "ecostvm_admin";

function requireAdmin(request: NextRequest) {
  const adminCookie = request.cookies.get(ADMIN_COOKIE);
  if (!adminCookie || adminCookie.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const id = params.id;
  try {
    const body = await request.json();
    const { blocked } = body;
    
    if (typeof blocked !== "boolean") {
      return NextResponse.json({ error: "Invalid blocked status." }, { status: 400 });
    }

    const result = await updateMemberBlockStatus(id, blocked);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update member" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const id = params.id;
  try {
    const result = await deleteMemberById(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete member" },
      { status: 500 }
    );
  }
}
