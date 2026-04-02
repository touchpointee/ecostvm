import { ObjectId } from "mongodb";
import { getDb } from "./mongo";
import { getJids } from "./jids";
import {
  connect,
  sendComposing,
  sendToGroupWithRetry,
  sendDirectMessageWithRetry,
} from "./whatsapp";

const HEADER = "🚗 *EcoSport TVM - Service Feedback*";
const PUBLIC_FEEDBACK_BASE =
  process.env.PUBLIC_FEEDBACK_URL || "https://example.com/feedback";

function formatGroupMessage(feedbackId: string): string {
  const url = `${PUBLIC_FEEDBACK_BASE}/${feedbackId}`;
  return [HEADER, "", `View full feedback: ${url}`].join("\n");
}

function formatCustomerMessage(feedbackId: string, name: string): string {
  const url = `${PUBLIC_FEEDBACK_BASE}/${feedbackId}`;
  return [
    `🚗 *EcoSport TVM – Feedback Received*`,
    "",
    `Hi ${name}! Thank you for your feedback.`,
    "",
    `You can track the status of your concern and add a review here:`,
    url,
    "",
    `Our team will attend to it shortly. 🙏`,
  ].join("\n");
}

let started = false;

// ── Retry failed group notifications ─────────────────────────────────────────
async function retryGroupMessages(): Promise<void> {
  try {
    const db = await getDb();
    const items = await db
      .collection("feedback")
      .find({ whatsappSent: false, attempts: { $lt: 10 } })
      .sort({ createdAt: 1 })
      .limit(10)
      .toArray();

    if (items.length === 0) return;

    const jids = await getJids();

    for (const doc of items) {
      const _id = doc._id as ObjectId;
      const id = _id.toString();
      const type = doc.type === "Escalation" ? "Escalation" : "Appreciation";
      const groupJid =
        type === "Escalation"
          ? jids.escalationGroupJid
          : jids.appreciationGroupJid || jids.escalationGroupJid;

      let whatsappSent = false;
      let whatsappError: string | null = null;

      if (!groupJid?.trim()) {
        whatsappError = "No group JID configured";
      } else {
        const text = formatGroupMessage(id);
        try {
          await sendComposing(groupJid.trim(), 3000);
          await sendToGroupWithRetry(groupJid.trim(), text);
          whatsappSent = true;
        } catch (err) {
          console.error("[retryScheduler] group send failed", err);
          whatsappError =
            err instanceof Error
              ? err.message
              : "Failed to send WhatsApp notification";
        }
      }

      await db.collection("feedback").updateOne(
        { _id },
        { $set: { whatsappSent, whatsappError }, $inc: { attempts: 1 } }
      );
    }
  } catch (e) {
    console.error("[retryScheduler] group batch failed", e);
  }
}

// ── Retry failed customer DMs ─────────────────────────────────────────────────
async function retryCustomerDMs(): Promise<void> {
  try {
    const db = await getDb();
    const items = await db
      .collection("feedback")
      .find({
        customerWhatsappSent: false,
        customerWhatsappAttempts: { $lt: 10 },
        contactNumber: { $exists: true, $ne: "" },
      })
      .sort({ createdAt: 1 })
      .limit(10)
      .toArray();

    if (items.length === 0) return;

    for (const doc of items) {
      const _id = doc._id as ObjectId;
      const id = _id.toString();
      const phone = doc.contactNumber ? String(doc.contactNumber).trim() : "";
      const name = doc.name ? String(doc.name).trim() : "Customer";

      let customerWhatsappSent = false;
      let customerWhatsappError: string | null = null;

      if (!phone) {
        customerWhatsappError = "No contact number";
      } else {
        try {
          await sendDirectMessageWithRetry(phone, formatCustomerMessage(id, name));
          customerWhatsappSent = true;
        } catch (err) {
          console.error("[retryScheduler] customer DM failed", err);
          customerWhatsappError =
            err instanceof Error ? err.message : "Failed to send customer DM";
        }
      }

      await db.collection("feedback").updateOne(
        { _id },
        {
          $set: { customerWhatsappSent, customerWhatsappError },
          $inc: { customerWhatsappAttempts: 1 },
        }
      );
    }
  } catch (e) {
    console.error("[retryScheduler] customer DM batch failed", e);
  }
}

async function retryFailedOnce(): Promise<void> {
  await retryGroupMessages();
  await retryCustomerDMs();
}

export function startRetryScheduler() {
  if (started) return;
  started = true;

  const FIVE_MINUTES = 5 * 60 * 1000;
  // Run once shortly after startup, then every 5 minutes.
  setTimeout(() => {
    connect().catch(() => {});
    retryFailedOnce();
  }, 30_000).unref?.();
  setInterval(retryFailedOnce, FIVE_MINUTES).unref?.();
}
