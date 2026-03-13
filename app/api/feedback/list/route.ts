import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const db = await getDb();
    const items = await db
      .collection("feedback")
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    const results = items.map((doc) => ({
      id: (doc._id as ObjectId).toString(),
      name: doc.name ?? "",
      vehicleNumber: doc.vehicleNumber ?? "",
      type: doc.type ?? "",
      heading: doc.heading ?? "",
      createdAt: doc.createdAt ?? null,
      whatsappSent: doc.whatsappSent ?? false,
      whatsappError: doc.whatsappError ?? null,
      attempts: doc.attempts ?? 0,
    }));

    return NextResponse.json({ items: results });
  } catch (e) {
    console.error("[api/feedback/list]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load feedback list" },
      { status: 500 }
    );
  }
}

