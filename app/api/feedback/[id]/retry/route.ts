import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";
import { getJids } from "@/lib/jids";
import { connect, sendComposing, sendToGroupWithRetry } from "@/lib/whatsapp";

const HEADER = "🚗 *EcoSport TVM - Service Feedback*";
const PUBLIC_FEEDBACK_BASE =
  process.env.PUBLIC_FEEDBACK_URL || "https://example.com/feedback";

function formatMessage(feedbackId: string): string {
  const url = `${PUBLIC_FEEDBACK_BASE}/${feedbackId}`;
  return [HEADER, "", `View full feedback: ${url}`].join("\n");
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
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

    const text = formatMessage(id);
    let whatsappSent = false;
    let whatsappError: string | null = null;

    try {
      const socket = await connect();
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

