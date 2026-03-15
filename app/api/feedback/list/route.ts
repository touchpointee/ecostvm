import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get("limit") ?? "200");
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 1000) : 200;
    const db = await getDb();
    const items = await db
      .collection("feedback")
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const results = items.map((doc) => ({
      id: (doc._id as ObjectId).toString(),
      name: doc.name ?? "",
      contactNumber: doc.contactNumber ?? "",
      vehicleNumber: doc.vehicleNumber ?? "",
      serviceDate: doc.serviceDate ?? "",
      advisor: doc.advisor ?? "",
      pickupDrop: doc.pickupDrop ?? "",
      concerns: doc.concerns ?? "",
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

