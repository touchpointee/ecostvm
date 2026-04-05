import { NextRequest, NextResponse } from "next/server";
import { acceptRegistration, rejectRegistration } from "@/lib/registrations";

const ADMIN_COOKIE = "ecostvm_admin";

function requireAdmin(request: NextRequest): NextResponse | null {
  if (request.cookies.get(ADMIN_COOKIE)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { action } = await request.json();
    if (action !== "accept" && action !== "reject") {
      return NextResponse.json({ error: "Action must be accept or reject" }, { status: 400 });
    }

    const result =
      action === "accept"
        ? await acceptRegistration(params.id)
        : await rejectRegistration(params.id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[api/registrations/[id] POST]", e);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
