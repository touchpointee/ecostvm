import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { Filter, ObjectId } from "mongodb";

type FeedbackDoc = {
  _id: ObjectId;
  name?: string;
  contactNumber?: string;
  vehicleNumber?: string;
  serviceDate?: string;
  advisor?: string;
  pickupDrop?: string;
  concerns?: string;
  type?: string;
  heading?: string;
  createdAt?: Date | null;
  whatsappSent?: boolean;
  whatsappError?: string | null;
  attempts?: number;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get("limit") ?? "200");
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 1000) : 200;
    const name = searchParams.get("name")?.trim() ?? "";
    const advisor = searchParams.get("advisor")?.trim() ?? "";
    const query: Filter<FeedbackDoc> = {};
    const andFilters: Filter<FeedbackDoc>[] = [];

    if (name) {
      andFilters.push({
        name: { $regex: escapeRegex(name), $options: "i" },
      });
    }

    if (advisor) {
      andFilters.push({
        advisor: { $regex: escapeRegex(advisor), $options: "i" },
      });
    }

    if (andFilters.length === 1) {
      Object.assign(query, andFilters[0]);
    } else if (andFilters.length > 1) {
      query.$and = andFilters;
    }

    const db = await getDb();
    const items = await db
      .collection<FeedbackDoc>("feedback")
      .find(query)
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

