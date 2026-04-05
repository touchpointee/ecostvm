import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { normalizeMembershipNumber } from "@/lib/members";

const ADMIN_COOKIE = "ecostvm_admin";

export async function POST(request: NextRequest) {
  if (request.cookies.get(ADMIN_COOKIE)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const collection = db.collection("logins");

  // Fetch every document that has a membershipNumber
  const docs = await collection
    .find({ membershipNumber: { $exists: true, $ne: "" } })
    .project({ _id: 1, membershipNumber: 1 })
    .toArray();

  let fixed = 0;
  let skipped = 0;

  for (const doc of docs) {
    const original = String(doc.membershipNumber ?? "");
    const cleaned = normalizeMembershipNumber(original);

    if (cleaned === original) {
      skipped++;
      continue;
    }

    await collection.updateOne(
      { _id: doc._id },
      { $set: { membershipNumber: cleaned } }
    );
    fixed++;
  }

  return NextResponse.json({
    success: true,
    total: docs.length,
    fixed,
    skipped,
    message: `Done. Fixed ${fixed} records, ${skipped} were already clean.`,
  });
}
