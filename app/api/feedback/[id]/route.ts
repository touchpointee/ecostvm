import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const id = String(params.id ?? "").trim();
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid feedback id" }, { status: 400 });
    }

    const db = await getDb();
    const doc = await db.collection("feedback").findOne({ _id: new ObjectId(id) });
    if (!doc) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    return NextResponse.json({
      item: {
        id: String(doc._id),
        name: doc.name ?? "",
        contactNumber: doc.contactNumber ?? "",
        vehicleNumber: doc.vehicleNumber ?? "",
        serviceDate: doc.serviceDate ?? "",
        advisor: doc.advisor ?? "",
        pickupDrop: doc.pickupDrop ?? "",
        concerns: doc.concerns ?? "",
        type: doc.type ?? "",
        createdAt: doc.createdAt ?? null,
        whatsappSent: doc.whatsappSent ?? false,
        whatsappError: doc.whatsappError ?? null,
      },
    });
  } catch (e) {
    console.error("[api/feedback/:id GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load feedback" },
      { status: 500 }
    );
  }
}
