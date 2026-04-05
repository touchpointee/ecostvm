import { NextRequest, NextResponse } from "next/server";
import { getJids } from "@/lib/jids";
import {
  connect,
  sendComposing,
  sendToGroupWithRetry,
  sendDirectMessageWithRetry,
} from "@/lib/whatsapp";
import { getDb } from "@/lib/mongo";
import { startBackgroundJobs } from "@/lib/backgroundJobs";

const HEADER = "🚗 *EcoSport TVM - Service Feedback*";
const PUBLIC_FEEDBACK_BASE =
  process.env.PUBLIC_FEEDBACK_URL || "https://example.com/feedback";

function formatGroupMessage(
  feedbackId: string,
  details: {
    name?: string;
    contactNumber?: string;
    vehicleNumber?: string;
    serviceDate?: string;
    advisor?: string;
    pickupDrop?: string;
  }
): string {
  const url = `${PUBLIC_FEEDBACK_BASE}/${feedbackId}`;
  const lines = [
    HEADER,
    "",
    details.name ? `Name: ${details.name}` : undefined,
    details.contactNumber ? `Contact: ${details.contactNumber}` : undefined,
    details.vehicleNumber ? `Vehicle: ${details.vehicleNumber}` : undefined,
    details.serviceDate ? `Service date: ${details.serviceDate}` : undefined,
    details.advisor ? `Advisor: ${details.advisor}` : undefined,
    details.pickupDrop ? `Pickup / drop: ${details.pickupDrop}` : undefined,
    "",
    `View full feedback: ${url}`,
  ].filter((line) => line !== undefined) as string[];
  return lines.join("\n");
}

function formatCustomerMessage(feedbackId: string, name: string, trackingCode: string): string {
  const url = `${PUBLIC_FEEDBACK_BASE}/${feedbackId}?token=${trackingCode}`;
  return [
    `🚗 *EcoSport TVM – Feedback Received*`,
    "",
    `Hi ${name}! Thank you for your feedback.`,
    "",
    `Your reference code: *${trackingCode}*`,
    "",
    `Track your concern and mark it resolved here:`,
    url,
    "",
    `Our team will attend to it shortly. 🙏`,
  ].join("\n");
}

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((r) => setTimeout(r, delay));
}

startBackgroundJobs();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      contactNumber,
      vehicleNumber,
      serviceDate,
      advisor,
      pickupDrop,
      concerns,
      type,
    } = body;

    if (!name || !vehicleNumber || !serviceDate || !concerns || !type) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, vehicleNumber, serviceDate, concerns, type (Appreciation/Escalation).",
        },
        { status: 400 }
      );
    }
    if (type !== "Appreciation" && type !== "Escalation") {
      return NextResponse.json(
        { error: "Invalid type. Use Appreciation or Escalation." },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Reject blocked members — check by contact number OR vehicle number
    {
      const orClauses: object[] = [];
      if (contactNumber) {
        const phone = String(contactNumber).replace(/\D/g, "").trim();
        if (phone) {
          orClauses.push({ phoneNumber: phone }, { contactNumber: phone });
        }
      }
      if (vehicleNumber) {
        const vn = String(vehicleNumber).trim().toUpperCase();
        if (vn) {
          orClauses.push({ vehicleNumber: vn });
        }
      }
      if (orClauses.length > 0) {
        const blockedMember = await db.collection("logins").findOne({
          $or: orClauses,
          isBlocked: true,
        });
        if (blockedMember) {
          return NextResponse.json(
            { error: "You are not a part of EcoSport TVM now." },
            { status: 403 }
          );
        }
      }
    }

    const now = new Date();
    const trackingCode = String(Math.floor(10000 + Math.random() * 90000));
    const insertResult = await db.collection("feedback").insertOne({
      name: String(name).trim(),
      contactNumber: contactNumber != null ? String(contactNumber).trim() : undefined,
      vehicleNumber: String(vehicleNumber).trim(),
      serviceDate: String(serviceDate),
      advisor: advisor != null ? String(advisor).trim() : undefined,
      pickupDrop: pickupDrop != null ? String(pickupDrop) : undefined,
      concerns: String(concerns).trim(),
      type: String(type),
      status: "Open",
      review: null,
      trackingCode,
      resolvedByCustomer: false,
      createdAt: now,
      whatsappSent: false,
      whatsappError: null,
      attempts: 0,
      customerWhatsappSent: false,
      customerWhatsappError: null,
      customerWhatsappAttempts: 0,
    });

    const feedbackId = String(insertResult.insertedId);

    // ── Send to admin WhatsApp group (best-effort) ──────────────────────────
    const jids = await getJids();
    const groupJid =
      type === "Escalation"
        ? jids.escalationGroupJid
        : jids.appreciationGroupJid || jids.escalationGroupJid;

    let whatsappSent = false;
    let whatsappError: string | null = null;

    if (groupJid?.trim()) {
      const text = formatGroupMessage(feedbackId, {
        name,
        contactNumber,
        vehicleNumber,
        serviceDate,
        advisor,
        pickupDrop,
      });
      try {
        await connect();
        await sendComposing(groupJid.trim(), 3000);
        await randomDelay(1000, 3000);
        await sendToGroupWithRetry(groupJid.trim(), text);
        whatsappSent = true;
      } catch (err) {
        console.error("[api/feedback] group WhatsApp send failed", err);
        whatsappError =
          err instanceof Error
            ? err.message
            : "Failed to send WhatsApp notification";
      }
    } else {
      whatsappError =
        "No group JID configured. Please set at least one group JID in the Admin portal.";
    }

    // ── Send personal DM to the customer (best-effort) ─────────────────────
    const customerPhone = contactNumber ? String(contactNumber).trim() : "";
    let customerWhatsappSent = false;
    let customerWhatsappError: string | null = null;

    if (customerPhone) {
      const customerText = formatCustomerMessage(
        feedbackId,
        String(name).trim(),
        trackingCode
      );
      try {
        await sendDirectMessageWithRetry(customerPhone, customerText);
        customerWhatsappSent = true;
      } catch (err) {
        console.error("[api/feedback] customer WhatsApp DM failed", err);
        customerWhatsappError =
          err instanceof Error ? err.message : "Failed to send customer DM";
      }
    } else {
      customerWhatsappError = "No contact number provided";
    }

    await db.collection("feedback").updateOne(
      { _id: insertResult.insertedId },
      {
        $set: {
          whatsappSent,
          whatsappError,
          customerWhatsappSent,
          customerWhatsappError,
        },
        $inc: { attempts: 1, customerWhatsappAttempts: 1 },
      }
    );

    return NextResponse.json({
      success: true,
      id: feedbackId,
      trackingCode,
      whatsappSent,
      whatsappError,
      customerWhatsappSent,
      customerWhatsappError,
    });
  } catch (e) {
    console.error("[api/feedback]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send feedback" },
      { status: 500 }
    );
  }
}
