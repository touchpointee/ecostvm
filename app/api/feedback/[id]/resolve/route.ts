import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const params = await Promise.resolve(context.params);
    const id = String(params.id ?? "").trim();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid feedback id" }, { status: 400 });
    }

    const body = await request.json();
    const token = String(body.token ?? "").trim();
    const rating = body.rating != null ? Number(body.rating) : null;
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";

    if (!token) {
      return NextResponse.json({ error: "Token is required." }, { status: 400 });
    }

    const db = await getDb();
    const existing = await db
      .collection("feedback")
      .findOne({ _id: new ObjectId(id) });

    if (!existing) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    if (String(existing.trackingCode ?? "") !== token) {
      return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    }

    const update: Record<string, unknown> = {
      resolvedByCustomer: true,
      updatedAt: new Date(),
    };

    if (
      rating !== null &&
      Number.isInteger(rating) &&
      rating >= 1 &&
      rating <= 5 &&
      !existing.review
    ) {
      update.review = { rating, comment, submittedAt: new Date() };
    }

    await db
      .collection("feedback")
      .updateOne({ _id: new ObjectId(id) }, { $set: update });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[api/feedback/:id/resolve]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to resolve feedback" },
      { status: 500 }
    );
  }
}
