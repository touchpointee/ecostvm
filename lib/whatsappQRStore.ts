import { getDb } from "./mongo";

const COLLECTION = "whatsapp_state";
const DOC_ID = "qr";
const TTL_MS = 90_000; // 90 seconds - QR is valid for a short time

type QRDoc = { _id: string; qr: string | null; updatedAt: Date };

export async function saveStoredQR(qr: string | null): Promise<void> {
  try {
    const db = await getDb();
    await db.collection<QRDoc>(COLLECTION).updateOne(
      { _id: DOC_ID },
      { $set: { qr, updatedAt: new Date() } },
      { upsert: true }
    );
  } catch (e) {
    console.error("[whatsappQRStore] save failed", e);
  }
}

export async function getStoredQR(): Promise<string | null> {
  try {
    const db = await getDb();
    const doc = await db.collection<QRDoc>(COLLECTION).findOne({ _id: DOC_ID });
    if (!doc?.qr || !doc.updatedAt) return null;
    const updatedAt = doc.updatedAt instanceof Date ? doc.updatedAt.getTime() : new Date(doc.updatedAt).getTime();
    if (Date.now() - updatedAt > TTL_MS) return null;
    return doc.qr as string;
  } catch (e) {
    console.error("[whatsappQRStore] get failed", e);
    return null;
  }
}
