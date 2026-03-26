import { ObjectId } from "mongodb";
import { getDb } from "./mongo";
import { getJids } from "./jids";
import { connect, sendComposing, sendToGroupWithRetry } from "./whatsapp";

const HEADER = "🚗 *EcoSport TVM - Service Feedback*";
const PUBLIC_FEEDBACK_BASE =
  process.env.PUBLIC_FEEDBACK_URL || "https://example.com/feedback";

function formatMessage(feedbackId: string): string {
  const url = `${PUBLIC_FEEDBACK_BASE}/${feedbackId}`;
  return [HEADER, "", `View full feedback: ${url}`].join("\n");
}

let started = false;

async function retryFailedOnce(): Promise<void> {
  try {
    const db = await getDb();
    const cursor = db
      .collection("feedback")
      .find({
        whatsappSent: false,
        attempts: { $lt: 10 },
      })
      .sort({ createdAt: 1 })
      .limit(10);

    const items = await cursor.toArray();
    if (items.length === 0) {
      return;
    }

    const jids = await getJids();

    for (const doc of items) {
      const _id = doc._id as ObjectId;
      const id = _id.toString();
      const type = doc.type === "Escalation" ? "Escalation" : "Appreciation";
      const groupJid =
        type === "Escalation" ? jids.escalationGroupJid : jids.appreciationGroupJid || jids.escalationGroupJid;

      let whatsappSent = false;
      let whatsappError: string | null = null;

      if (!groupJid?.trim()) {
        whatsappError = "No group JID configured";
      } else {
        const text = formatMessage(id);
        try {
          await sendComposing(groupJid.trim(), 3000);
          await sendToGroupWithRetry(groupJid.trim(), text);
          whatsappSent = true;
        } catch (err) {
          console.error("[retryScheduler] WhatsApp send failed", err);
          whatsappError =
            err instanceof Error ? err.message : "Failed to send WhatsApp notification";
        }
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
    }
  } catch (e) {
    console.error("[retryScheduler] batch failed", e);
  }
}

export function startRetryScheduler() {
  if (started) return;
  started = true;
  const FIVE_MINUTES = 5 * 60 * 1000;
  // Run once shortly after start, then every 5 minutes.
  setTimeout(retryFailedOnce, 30_000).unref?.();
  setInterval(retryFailedOnce, FIVE_MINUTES).unref?.();
}

