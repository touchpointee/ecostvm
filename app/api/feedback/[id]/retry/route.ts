import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";
import { getJids } from "@/lib/jids";
import { getConnectionStatus, sendComposing, sendToGroupWithRetry } from "@/lib/whatsapp";

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
    concerns?: string;
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
    details.concerns ? `Service feedback / concerns: ${details.concerns}` : undefined,
    "",
    `View full feedback: ${url}`,
  ].filter((line) => line !== undefined) as string[];
  return lines.join("\n");
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
    // Check WhatsApp connection status before attempting to send
    const status = getConnectionStatus();
    if (status !== "connected") {
      return NextResponse.json(
        { success: false, error: "WhatsApp is not connected. Please connect WhatsApp from the admin dashboard first." },
        { status: 503 }
      );
    }

    const db = await getDb();
    const _id = new ObjectId(id);
    const feedback = await db.collection("feedback").findOne({ _id });
    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    const jids = await getJids();
    const type = feedback.type === "Escalation" ? "Escalation" : "Appreciation";
    const groupJid =
      type === "Escalation" ? jids.escalationGroupJid : jids.appreciationGroupJid || jids.escalationGroupJid;

    if (!groupJid?.trim()) {
      await db.collection("feedback").updateOne(
        { _id },
        {
          $set: {
            whatsappSent: false,
            whatsappError: "No group JID configured",
          },
          $inc: { attempts: 1 },
        }
      );
      return NextResponse.json({
        success: false,
        error: "No group JID configured",
      });
    }

    const text = formatMessage(id, {
      name: feedback.name,
      contactNumber: feedback.contactNumber,
      vehicleNumber: feedback.vehicleNumber,
      serviceDate: feedback.serviceDate,
      advisor: feedback.advisor,
      pickupDrop: feedback.pickupDrop,
      concerns: feedback.concerns,
    });
    let whatsappSent = false;
    let whatsappError: string | null = null;

    try {
      await sendComposing(groupJid.trim(), 3000);
      await sendToGroupWithRetry(groupJid.trim(), text);
      whatsappSent = true;
    } catch (err) {
      console.error("[api/feedback/:id/retry] WhatsApp send failed", err);
      whatsappError =
        err instanceof Error ? err.message : "Failed to send WhatsApp notification";
    }

    await db.collection("feedback").updateOne(
      { _id },
      {
        $set: {
          whatsappSent,
          whatsappError,
        },
        $inc: { attempts: 1 },
      }
    );

    return NextResponse.json({ success: whatsappSent, error: whatsappError });
  } catch (e) {
    console.error("[api/feedback/:id/retry]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Retry failed" },
      { status: 500 }
    );
  }
}
