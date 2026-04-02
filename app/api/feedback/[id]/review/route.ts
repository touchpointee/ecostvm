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
    const rating = Number(body.rating);
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be an integer between 1 and 5." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const existing = await db
      .collection("feedback")
      .findOne({ _id: new ObjectId(id) });

    if (!existing) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    if (existing.review) {
      return NextResponse.json(
        { error: "A review has already been submitted for this feedback." },
        { status: 409 }
      );
    }

    const review = { rating, comment, submittedAt: new Date() };

    await db.collection("feedback").updateOne(
      { _id: new ObjectId(id) },
      { $set: { review, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true, review });
  } catch (e) {
    console.error("[api/feedback/:id/review POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to submit review" },
      { status: 500 }
    );
  }
}
