import { NextRequest, NextResponse } from "next/server";
import { getJids } from "@/lib/jids";
import { connect, sendComposing } from "@/lib/whatsapp";
import { getDb } from "@/lib/mongo";
import { startRetryScheduler } from "@/lib/retryScheduler";

const HEADER = "🚗 *EcoSport TVM - Service Feedback*";
const PUBLIC_FEEDBACK_BASE =
  process.env.PUBLIC_FEEDBACK_URL || "https://example.com/feedback";

function formatMessage(
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

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((r) => setTimeout(r, delay));
}

// Ensure the background retry scheduler is running in this server process.
startRetryScheduler();

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
    } = body;
    if (!name || !vehicleNumber || !serviceDate || !concerns) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, vehicleNumber, serviceDate, concerns (service feedback).",
        },
        { status: 400 }
      );
    }

    // 1. Persist feedback in MongoDB
    const db = await getDb();
    const now = new Date();
    const insertResult = await db.collection("feedback").insertOne({
      name: String(name).trim(),
      contactNumber: contactNumber != null ? String(contactNumber).trim() : undefined,
      vehicleNumber: String(vehicleNumber).trim(),
      serviceDate: String(serviceDate),
      advisor: advisor != null ? String(advisor).trim() : undefined,
      pickupDrop: pickupDrop != null ? String(pickupDrop) : undefined,
      concerns: String(concerns).trim(),
      createdAt: now,
      whatsappSent: false,
      whatsappError: null,
      attempts: 0,
    });

    // 2. Route to appropriate WhatsApp group (best-effort only)
    const jids = await getJids();
    // Use Appreciation group JID for service feedback by default
    const groupJid = jids.appreciationGroupJid || jids.escalationGroupJid;
    let whatsappSent = false;
    let whatsappError: string | null = null;

    if (groupJid?.trim()) {
      const text = formatMessage(String(insertResult.insertedId), {
        name,
        contactNumber,
        vehicleNumber,
        serviceDate,
        advisor,
        pickupDrop,
      });

      try {
        const socket = await connect();
        await sendComposing(groupJid.trim(), 3000);
        await randomDelay(1000, 3000);
        await socket.sendMessage(groupJid.trim(), { text });
        whatsappSent = true;
      } catch (err) {
        console.error("[api/feedback] WhatsApp send failed", err);
        whatsappError =
          err instanceof Error ? err.message : "Failed to send WhatsApp notification";
      }
    } else {
      whatsappError =
        "No group JID configured. Please set at least one group JID in the Admin portal.";
    }

    await db.collection("feedback").updateOne(
      { _id: insertResult.insertedId },
      {
        $set: {
          whatsappSent,
          whatsappError,
        },
        $inc: { attempts: 1 },
      }
    );

    return NextResponse.json({
      success: true,
      id: insertResult.insertedId,
      whatsappSent,
      whatsappError,
    });
  } catch (e) {
    console.error("[api/feedback]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send feedback" },
      { status: 500 }
    );
  }
}
