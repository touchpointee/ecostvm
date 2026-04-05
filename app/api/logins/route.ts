import { NextRequest, NextResponse } from "next/server";
import { ensureMemberIndexes, listMembers, upsertMember, getNextMembershipNumber } from "@/lib/members";
import { createMembersWorkbook } from "@/lib/xlsx";
import { getDb } from "@/lib/mongo";

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

    if (searchParams.get("check") === "membership") {
      const q = searchParams.get("membershipNumber") || "";
      const collection = await getDb().then((db) => db.collection("logins"));
      const exists = !!(await collection.findOne({ membershipNumber: q }));
      const next = await getNextMembershipNumber();
      return NextResponse.json({ exists, next });
    }

    const isXlsx = searchParams.get("format") === "xlsx";
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = isXlsx ? 0 : parseInt(searchParams.get("limit") ?? "50", 10);

    const result = await listMembers({
      q: searchParams.get("q") ?? "",
      name: searchParams.get("name") ?? "",
      membershipNumber: searchParams.get("membershipNumber") ?? "",
      contactNumber: searchParams.get("contactNumber") ?? "",
      model: searchParams.get("model") ?? "",
      purchaseMonth: searchParams.get("purchaseMonth") ?? "",
      manufacturingYear: searchParams.get("manufacturingYear") ?? "",
      variant: searchParams.get("variant") ?? "",
      vehicleNumber: searchParams.get("vehicleNumber") ?? "",
      vehicleColor: searchParams.get("vehicleColor") ?? "",
      place: searchParams.get("place") ?? "",
      address: searchParams.get("address") ?? "",
      occupation: searchParams.get("occupation") ?? "",
      mailId: searchParams.get("mailId") ?? "",
      bloodGroup: searchParams.get("bloodGroup") ?? "",
      dateOfBirth: searchParams.get("dateOfBirth") ?? "",
      emergencyContact: searchParams.get("emergencyContact") ?? "",
      suggestions: searchParams.get("suggestions") ?? "",
      page,
      limit,
    });

    if (isXlsx) {
      const workbook = createMembersWorkbook(result.items);
      const filename = `members-${new Date().toISOString().slice(0, 10)}.xlsx`;
      return new NextResponse(new Uint8Array(workbook), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }
    return NextResponse.json({ items: result.items, total: result.total, page, limit });
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

    const requiredFields = ["name", "contactNumber", "vehicleNumber", "place", "address", "dateOfBirth"];
    for (const field of requiredFields) {
        if (!body[field] || String(body[field]).trim() === "") {
            return NextResponse.json({ error: `Please fill in all fields (missing ${field}).` }, { status: 400 });
        }
    }

    if (!/^[a-zA-Z ]+$/.test(String(body?.name ?? ""))) {
      return NextResponse.json({ error: "Name should only contain letters and spaces." }, { status: 400 });
    }
    const rawContact = String(body?.contactNumber ?? body?.number ?? body?.phoneNumber ?? "");
    if (!/^\d{10}$/.test(rawContact.replace(/\D/g, ''))) {
      return NextResponse.json({ error: "Contact number must contain exactly 10 digits." }, { status: 400 });
    }
    if (!/^([A-Za-z]{2}[ -]?[0-9]{1,2}[ -]?[A-Za-z]{0,2}[ -]?[0-9]{4}|[0-9]{2}[ -]?[Bb][Hh][ -]?[0-9]{4}[ -]?[A-Za-z]{1,2})$/.test(String(body?.vehicleNumber ?? ""))) {
      return NextResponse.json({ error: "Invalid vehicle number format (e.g., KL01AB1234 or 21BH1234AA)." }, { status: 400 });
    }

    const result = await upsertMember({
      id: body?.id,
      name: body?.name,
      membershipNumber: body?.membershipNumber,
      contactNumber: body?.contactNumber ?? body?.number ?? body?.phoneNumber,
      model: body?.model,
      purchaseMonth: body?.purchaseMonth,
      manufacturingYear: body?.manufacturingYear,
      variant: body?.variant,
      vehicleColor: body?.vehicleColor,
      vehicleNumber: body?.vehicleNumber,
      place: body?.place,
      address: body?.address,
      occupation: body?.occupation,
      mailId: body?.mailId,
      bloodGroup: body?.bloodGroup,
      dateOfBirth: body?.dateOfBirth,
      emergencyContact: body?.emergencyContact,
      suggestions: body?.suggestions,
      source: "manual",
    }, body?.mode === "edit");
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
