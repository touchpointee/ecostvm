import { NextRequest, NextResponse } from "next/server";
import { bulkUpsertMembers, ensureMemberIndexes } from "@/lib/members";
import { parseMembersFromXlsx } from "@/lib/xlsx";

const ADMIN_COOKIE = "ecostvm_admin";

function requireAdmin(request: NextRequest): NextResponse | null {
  const adminCookie = request.cookies.get(ADMIN_COOKIE)?.value;
  if (adminCookie !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    await ensureMemberIndexes();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please choose an Excel file." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "Only .xlsx Excel files are supported." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = parseMembersFromXlsx(buffer);
    if (rows.length === 0) {
      return NextResponse.json({ error: "No data rows found in the Excel file." }, { status: 400 });
    }

    const result = await bulkUpsertMembers(rows);
    return NextResponse.json({
      success: true,
      totalRows: rows.length,
      inserted: result.inserted,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors.slice(0, 20),
    });
  } catch (e) {
    console.error("[api/logins/upload POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to upload Excel data" },
      { status: 500 }
    );
  }
}
