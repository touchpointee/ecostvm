import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";
import { sendDirectMessageWithRetry } from "@/lib/whatsapp";

export type FeedbackStatus = "Open" | "In Progress" | "Resolved" | "Closed";

const VALID_STATUSES: FeedbackStatus[] = [
  "Open",
  "In Progress",
  "Resolved",
  "Closed",
];

const PUBLIC_FEEDBACK_BASE =
  process.env.PUBLIC_FEEDBACK_URL || "https://example.com/feedback";

function formatResolvedDM(feedbackId: string, name: string): string {
  const url = `${PUBLIC_FEEDBACK_BASE}/${feedbackId}`;
  return [
    `🚗 *EcoSport TVM – Issue Resolved*`,
    "",
    `Hi ${name}! Your service concern has been resolved by our team.`,
    "",
    `Please take a moment to rate your experience:`,
    url,
    "",
    `Thank you for being part of EcoSport Owners Club! 🙏`,
  ].join("\n");
}

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function resolveId(context: RouteContext): Promise<string | null> {
  const params = await Promise.resolve(context.params);
  const id = String(params.id ?? "").trim();
  return ObjectId.isValid(id) ? id : null;
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(_request: Request, context: RouteContext) {
  try {
    const id = await resolveId(context);
    if (!id) {
      return NextResponse.json({ error: "Invalid feedback id" }, { status: 400 });
    }

    const db = await getDb();
    const doc = await db
      .collection("feedback")
      .findOne({ _id: new ObjectId(id) });

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
        status: (doc.status as FeedbackStatus) ?? "Open",
        review: doc.review ?? null,
        createdAt: doc.createdAt ?? null,
        whatsappSent: doc.whatsappSent ?? false,
        whatsappError: doc.whatsappError ?? null,
        customerWhatsappSent: doc.customerWhatsappSent ?? false,
        customerWhatsappError: doc.customerWhatsappError ?? null,
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

// ─── PATCH (admin only) ───────────────────────────────────────────────────────
export async function PATCH(request: NextRequest, context: RouteContext) {
  const adminCookie = request.cookies.get("ecostvm_admin")?.value;
  if (adminCookie !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = await resolveId(context);
    if (!id) {
      return NextResponse.json({ error: "Invalid feedback id" }, { status: 400 });
    }

    const body = await request.json();
    const { status } = body as { status: FeedbackStatus };

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Use one of: ${VALID_STATUSES.join(", ")}`,
        },
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

    const prevStatus = (existing.status as FeedbackStatus) ?? "Open";

    await db.collection("feedback").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    // Send customer notification when status first reaches "Resolved"
    if (status === "Resolved" && prevStatus !== "Resolved") {
      const phone = existing.contactNumber
        ? String(existing.contactNumber).trim()
        : "";
      const name = existing.name ? String(existing.name).trim() : "Customer";
      if (phone) {
        sendDirectMessageWithRetry(phone, formatResolvedDM(id, name)).catch(
          (e) => console.error("[api/feedback/:id PATCH] resolved DM failed", e)
        );
      }
    }

    return NextResponse.json({ success: true, status });
  } catch (e) {
    console.error("[api/feedback/:id PATCH]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update feedback" },
      { status: 500 }
    );
  }
}
