import { ObjectId } from "mongodb";
import { getDb } from "./mongo";
import { upsertMember } from "./members";
import { getWelcomeTemplate, renderWelcomeMessage } from "./settings";
import { sendDirectMessageWithRetry } from "./whatsapp";

export type PendingRegistration = {
  id: string;
  name: string;
  membershipNumber: string;
  contactNumber: string;
  model: string;
  purchaseMonth: string;
  manufacturingYear: string;
  variant: string;
  vehicleColor: string;
  vehicleNumber: string;
  place: string;
  address: string;
  occupation: string;
  mailId: string;
  bloodGroup: string;
  dateOfBirth: string;
  emergencyContact: string;
  suggestions: string;
  submittedAt: string;
};

type PendingDoc = {
  _id: ObjectId;
  name?: string;
  membershipNumber?: string;
  contactNumber?: string;
  model?: string;
  purchaseMonth?: string;
  manufacturingYear?: string;
  variant?: string;
  vehicleColor?: string;
  vehicleNumber?: string;
  place?: string;
  address?: string;
  occupation?: string;
  mailId?: string;
  bloodGroup?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  suggestions?: string;
  submittedAt: Date;
};

function pendingCollection() {
  return getDb().then((db) => db.collection<PendingDoc>("pending_registrations"));
}

function mapDoc(doc: PendingDoc): PendingRegistration {
  return {
    id: doc._id.toString(),
    name: doc.name ?? "",
    membershipNumber: doc.membershipNumber ?? "",
    contactNumber: doc.contactNumber ?? "",
    model: doc.model ?? "",
    purchaseMonth: doc.purchaseMonth ?? "",
    manufacturingYear: doc.manufacturingYear ?? "",
    variant: doc.variant ?? "",
    vehicleColor: doc.vehicleColor ?? "",
    vehicleNumber: doc.vehicleNumber ?? "",
    place: doc.place ?? "",
    address: doc.address ?? "",
    occupation: doc.occupation ?? "",
    mailId: doc.mailId ?? "",
    bloodGroup: doc.bloodGroup ?? "",
    dateOfBirth: doc.dateOfBirth ?? "",
    emergencyContact: doc.emergencyContact ?? "",
    suggestions: doc.suggestions ?? "",
    submittedAt: doc.submittedAt.toISOString(),
  };
}

export async function createPendingRegistration(
  data: Omit<PendingRegistration, "id" | "submittedAt">
): Promise<{ ok: boolean; error?: string }> {
  try {
    const collection = await pendingCollection();
    await collection.insertOne({ ...data, submittedAt: new Date() } as PendingDoc);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save registration" };
  }
}

export async function listPendingRegistrations(): Promise<PendingRegistration[]> {
  const collection = await pendingCollection();
  const docs = await collection.find({}).sort({ submittedAt: -1 }).toArray();
  return docs.map(mapDoc);
}

export async function countPendingRegistrations(): Promise<number> {
  const collection = await pendingCollection();
  return collection.countDocuments({});
}

export async function acceptRegistration(id: string): Promise<{ ok: boolean; error?: string }> {
  let objId: ObjectId;
  try {
    objId = new ObjectId(id);
  } catch {
    return { ok: false, error: "Invalid ID" };
  }

  const collection = await pendingCollection();
  const doc = await collection.findOne({ _id: objId });
  if (!doc) return { ok: false, error: "Registration not found" };

  const result = await upsertMember({
    name: doc.name,
    membershipNumber: doc.membershipNumber,
    contactNumber: doc.contactNumber,
    model: doc.model,
    purchaseMonth: doc.purchaseMonth,
    manufacturingYear: doc.manufacturingYear,
    variant: doc.variant,
    vehicleColor: doc.vehicleColor,
    vehicleNumber: doc.vehicleNumber,
    place: doc.place,
    address: doc.address,
    occupation: doc.occupation,
    mailId: doc.mailId,
    bloodGroup: doc.bloodGroup,
    dateOfBirth: doc.dateOfBirth,
    emergencyContact: doc.emergencyContact,
    suggestions: doc.suggestions,
    source: "registration",
  });

  if (!result.ok) return { ok: false, error: result.error };

  await collection.deleteOne({ _id: objId });

  // Send WhatsApp welcome message (best-effort – never block accept on WA failure)
  if (doc.contactNumber) {
    getWelcomeTemplate()
      .then((template) => {
        const message = renderWelcomeMessage(template, {
          name: doc.name ?? "",
          membershipNumber: doc.membershipNumber ?? "",
          contactNumber: doc.contactNumber ?? "",
          model: doc.model ?? "",
          vehicleNumber: doc.vehicleNumber ?? "",
          place: doc.place ?? "",
          variant: doc.variant ?? "",
          vehicleColor: doc.vehicleColor ?? "",
          purchaseMonth: doc.purchaseMonth ?? "",
          manufacturingYear: doc.manufacturingYear ?? "",
          bloodGroup: doc.bloodGroup ?? "",
          dateOfBirth: doc.dateOfBirth ?? "",
          mailId: doc.mailId ?? "",
          occupation: doc.occupation ?? "",
          emergencyContact: doc.emergencyContact ?? "",
        });
        return sendDirectMessageWithRetry(doc.contactNumber!, message);
      })
      .catch((e) => console.error("[registrations] welcome WhatsApp failed:", e));
  }

  return { ok: true };
}

export async function rejectRegistration(id: string): Promise<{ ok: boolean; error?: string }> {
  let objId: ObjectId;
  try {
    objId = new ObjectId(id);
  } catch {
    return { ok: false, error: "Invalid ID" };
  }

  const collection = await pendingCollection();
  const result = await collection.deleteOne({ _id: objId });
  if (result.deletedCount === 0) return { ok: false, error: "Registration not found" };
  return { ok: true };
}
