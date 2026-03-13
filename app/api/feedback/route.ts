import { NextRequest, NextResponse } from "next/server";
import { getJids } from "@/lib/jids";
import { connect, sendComposing } from "@/lib/whatsapp";
import { getDb } from "@/lib/mongo";

const HEADER = "🚗 *EcoSport TVM - New Feedback*";
const PUBLIC_FEEDBACK_BASE =
  process.env.PUBLIC_FEEDBACK_URL || "https://example.com/feedback";

function formatMessage(feedbackId: string): string {
  const url = `${PUBLIC_FEEDBACK_BASE}/${feedbackId}`;
  const lines = [HEADER, "", `View feedback: ${url}`];
  return lines.join("\n");
}

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((r) => setTimeout(r, delay));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, vehicleNumber, type, heading, detailedDescription } = body;
    if (!name || !vehicleNumber || !type || !detailedDescription) {
      return NextResponse.json(
        { error: "Missing required fields: name, vehicleNumber, type, detailedDescription" },
        { status: 400 }
      );
    }
    if (type !== "Appreciation" && type !== "Escalation") {
      return NextResponse.json({ error: "Invalid type. Use Appreciation or Escalation." }, { status: 400 });
    }

    // 1. Persist feedback in MongoDB
    const db = await getDb();
    const now = new Date();
    const insertResult = await db.collection("feedback").insertOne({
      name: String(name).trim(),
      vehicleNumber: String(vehicleNumber).trim(),
      type: String(type),
      heading: heading != null ? String(heading) : undefined,
      detailedDescription: String(detailedDescription).trim(),
      createdAt: now,
      whatsappSent: false,
      whatsappError: null,
      attempts: 0,
    });

    // 2. Route to appropriate WhatsApp group (best-effort only)
    const jids = await getJids();
    const groupJid = type === "Appreciation" ? jids.appreciationGroupJid : jids.escalationGroupJid;
    let whatsappSent = false;
    let whatsappError: string | null = null;

    if (groupJid?.trim()) {
      const text = formatMessage(String(insertResult.insertedId));

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
      whatsappError = `No ${type} group JID configured. Please set it in the Admin portal.`;
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
