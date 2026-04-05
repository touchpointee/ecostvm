import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";

const ADMIN_COOKIE = "ecostvm_admin";

export async function POST(request: NextRequest) {
  if (request.cookies.get(ADMIN_COOKIE)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (body?.confirm !== "DELETE ALL MEMBERS") {
      return NextResponse.json(
        { error: "Confirmation phrase did not match." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const result = await db.collection("logins").deleteMany({});

    return NextResponse.json({
      success: true,
      deleted: result.deletedCount,
      message: `All ${result.deletedCount} member records have been deleted.`,
    });
  } catch (e) {
    console.error("[api/admin/clear-members]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to clear members" },
      { status: 500 }
    );
  }
}
