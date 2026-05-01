import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { Filter, ObjectId } from "mongodb";
import { createFeedbackWorkbook } from "@/lib/xlsx";

type FeedbackReview = {
  rating: number;
  comment: string;
  submittedAt: Date;
};

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
  status?: string;
  review?: FeedbackReview | null;
  createdAt?: Date | null;
  whatsappSent?: boolean;
  whatsappError?: string | null;
  attempts?: number;
  customerWhatsappSent?: boolean;
  customerWhatsappError?: string | null;
  customerWhatsappAttempts?: number;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseBooleanFilter(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (["true", "yes", "sent", "1"].includes(normalized)) return true;
  if (["false", "no", "pending", "not sent", "0"].includes(normalized)) return false;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") ?? "").trim().toLowerCase();
    const limitParam = Number(searchParams.get("limit") ?? "200");
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 1000)
      : 200;
    const name = searchParams.get("name")?.trim() ?? "";
    const contactNumber = searchParams.get("contactNumber")?.trim() ?? "";
    const vehicleNumber = searchParams.get("vehicleNumber")?.trim() ?? "";
    const serviceDate = searchParams.get("serviceDate")?.trim() ?? "";
    const advisor = searchParams.get("advisor")?.trim() ?? "";
    const pickupDrop = searchParams.get("pickupDrop")?.trim() ?? "";
    const concerns = searchParams.get("concerns")?.trim() ?? "";
    const type = searchParams.get("type")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";
    const whatsappSent = searchParams.get("whatsappSent")?.trim() ?? "";
    const customerWhatsappSent =
      searchParams.get("customerWhatsappSent")?.trim() ?? "";
    const reviewRating = searchParams.get("reviewRating")?.trim() ?? "";

    const query: Filter<FeedbackDoc> = {};
    const andFilters: Filter<FeedbackDoc>[] = [];

    if (name) {
      andFilters.push({ name: { $regex: escapeRegex(name), $options: "i" } });
    }
    if (contactNumber) {
      andFilters.push({
        contactNumber: { $regex: escapeRegex(contactNumber), $options: "i" },
      });
    }
    if (vehicleNumber) {
      andFilters.push({
        vehicleNumber: { $regex: escapeRegex(vehicleNumber), $options: "i" },
      });
    }
    if (serviceDate) {
      andFilters.push({
        serviceDate: { $regex: escapeRegex(serviceDate), $options: "i" },
      });
    }
    if (advisor) {
      andFilters.push({
        advisor: { $regex: escapeRegex(advisor), $options: "i" },
      });
    }
    if (pickupDrop) {
      andFilters.push({
        pickupDrop: { $regex: escapeRegex(pickupDrop), $options: "i" },
      });
    }
    if (concerns) {
      andFilters.push({
        concerns: { $regex: escapeRegex(concerns), $options: "i" },
      });
    }
    if (type) {
      andFilters.push({ type });
    }
    if (status) {
      andFilters.push({ status });
    }
    const whatsappSentBool = parseBooleanFilter(whatsappSent);
    if (whatsappSentBool !== null) {
      andFilters.push({ whatsappSent: whatsappSentBool });
    }
    const customerWhatsappSentBool = parseBooleanFilter(customerWhatsappSent);
    if (customerWhatsappSentBool !== null) {
      andFilters.push({ customerWhatsappSent: customerWhatsappSentBool });
    }
    if (reviewRating) {
      const rating = Number(reviewRating);
      if (Number.isFinite(rating) && rating >= 1 && rating <= 5) {
        andFilters.push({ "review.rating": rating });
      }
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
      status: doc.status ?? "Open",
      review: doc.review
        ? {
            rating: doc.review.rating,
            comment: doc.review.comment,
            submittedAt: doc.review.submittedAt,
          }
        : null,
      createdAt: doc.createdAt ?? null,
      whatsappSent: doc.whatsappSent ?? false,
      whatsappError: doc.whatsappError ?? null,
      attempts: doc.attempts ?? 0,
      customerWhatsappSent: doc.customerWhatsappSent ?? false,
      customerWhatsappError: doc.customerWhatsappError ?? null,
    }));

    if (format === "xlsx") {
      const workbook = createFeedbackWorkbook(
        items.map((doc) => ({
          createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
          name: doc.name ?? "",
          contactNumber: doc.contactNumber ?? "",
          vehicleNumber: doc.vehicleNumber ?? "",
          serviceDate: doc.serviceDate ?? "",
          advisor: doc.advisor ?? "",
          pickupDrop: doc.pickupDrop ?? "",
          concerns: doc.concerns ?? "",
          type: doc.type ?? "",
          status: doc.status ?? "Open",
          whatsappSent: doc.whatsappSent ? "Yes" : "No",
          whatsappError: doc.whatsappError ?? "",
          customerWhatsappSent: doc.customerWhatsappSent ? "Yes" : "No",
          customerWhatsappError: doc.customerWhatsappError ?? "",
          reviewRating: doc.review?.rating != null ? String(doc.review.rating) : "",
          reviewComment: doc.review?.comment ?? "",
          reviewSubmittedAt: doc.review?.submittedAt
            ? new Date(doc.review.submittedAt).toISOString()
            : "",
        }))
      );

      const stamp = new Date().toISOString().slice(0, 10);
      return new NextResponse(workbook, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="feedback-report-${stamp}.xlsx"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({ items: results });
  } catch (e) {
    console.error("[api/feedback/list]", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Failed to load feedback list",
      },
      { status: 500 }
    );
  }
}
