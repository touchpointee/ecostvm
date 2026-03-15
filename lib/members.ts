import { Filter, ObjectId } from "mongodb";
import { getDb } from "./mongo";

export type MemberInput = {
  name?: string;
  membershipNumber?: string;
  contactNumber?: string;
  phoneNumber?: string;
  vehicleColor?: string;
  vehicleNumber?: string;
  place?: string;
  address?: string;
  bloodGroup?: string;
  dateOfBirth?: string;
  source?: "manual" | "upload" | "bootstrap";
};

export type MemberRecord = {
  id: string;
  name: string;
  membershipNumber: string;
  contactNumber: string;
  vehicleColor: string;
  vehicleNumber: string;
  place: string;
  address: string;
  bloodGroup: string;
  dateOfBirth: string;
  createdAt: string | null;
  updatedAt: string | null;
  source: string;
};

type MemberDoc = {
  _id: ObjectId;
  phoneNumber: string;
  contactNumber?: string;
  name?: string;
  membershipNumber?: string;
  vehicleColor?: string;
  vehicleNumber?: string;
  place?: string;
  address?: string;
  bloodGroup?: string;
  dateOfBirth?: string;
  source?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type MemberFilters = {
  q?: string;
  name?: string;
  membershipNumber?: string;
  contactNumber?: string;
  vehicleNumber?: string;
  vehicleColor?: string;
  place?: string;
  address?: string;
  bloodGroup?: string;
  dateOfBirth?: string;
};

function membersCollection() {
  return getDb().then((db) => db.collection<MemberDoc>("logins"));
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function scientificToPlainString(value: string): string {
  const normalized = value.trim();
  if (!/e/i.test(normalized)) return normalized;
  const asNumber = Number(normalized);
  if (!Number.isFinite(asNumber)) return normalized;
  return asNumber.toLocaleString("fullwide", { useGrouping: false });
}

export function normalizePhoneNumber(value: unknown): string {
  const raw = scientificToPlainString(cleanText(value));
  return raw.replace(/\D/g, "").trim();
}

function normalizeLooseText(value: unknown): string {
  return cleanText(value).replace(/\s+/g, " ");
}

function normalizeDate(value: unknown): string {
  const raw = cleanText(value);
  if (!raw) return "";
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const serial = Number(raw);
    if (Number.isFinite(serial) && serial > 0) {
      const utc = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
      return new Date(utc).toISOString().slice(0, 10);
    }
  }
  const replaced = raw.replace(/\./g, "/").replace(/-/g, "/");
  const parsed = new Date(replaced);
  if (!Number.isNaN(parsed.getTime()) && !/xxxx/i.test(raw)) {
    return parsed.toISOString().slice(0, 10);
  }
  return raw;
}

function mapMemberDoc(doc: MemberDoc): MemberRecord {
  return {
    id: doc._id.toString(),
    name: doc.name ?? "",
    membershipNumber: doc.membershipNumber ?? "",
    contactNumber: doc.contactNumber ?? doc.phoneNumber ?? "",
    vehicleColor: doc.vehicleColor ?? "",
    vehicleNumber: doc.vehicleNumber ?? "",
    place: doc.place ?? "",
    address: doc.address ?? "",
    bloodGroup: doc.bloodGroup ?? "",
    dateOfBirth: doc.dateOfBirth ?? "",
    createdAt: doc.createdAt?.toISOString() ?? null,
    updatedAt: doc.updatedAt?.toISOString() ?? null,
    source: doc.source ?? "manual",
  };
}

function buildRegexFilter(value: string) {
  return { $regex: value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
}

export async function ensureMemberIndexes() {
  const collection = await membersCollection();
  await Promise.all([
    collection.createIndex({ phoneNumber: 1 }, { unique: true }),
    collection.createIndex({ name: 1 }),
    collection.createIndex({ membershipNumber: 1 }),
    collection.createIndex({ vehicleNumber: 1 }),
    collection.createIndex({ place: 1 }),
    collection.createIndex({ bloodGroup: 1 }),
  ]);
}

export async function upsertMember(input: MemberInput): Promise<{ ok: boolean; error?: string; member?: MemberRecord }> {
  const phoneNumber = normalizePhoneNumber(input.contactNumber ?? input.phoneNumber ?? "");
  if (!phoneNumber || phoneNumber.length < 10) {
    return { ok: false, error: "Enter a valid contact number with at least 10 digits." };
  }

  const now = new Date();
  const payload = {
    phoneNumber,
    contactNumber: phoneNumber,
    name: normalizeLooseText(input.name),
    membershipNumber: normalizeLooseText(input.membershipNumber),
    vehicleColor: normalizeLooseText(input.vehicleColor),
    vehicleNumber: normalizeLooseText(input.vehicleNumber).toUpperCase(),
    place: normalizeLooseText(input.place),
    address: normalizeLooseText(input.address),
    bloodGroup: normalizeLooseText(input.bloodGroup).toUpperCase(),
    dateOfBirth: normalizeDate(input.dateOfBirth),
    source: input.source ?? "manual",
    updatedAt: now,
  };

  const collection = await membersCollection();
  try {
    await collection.updateOne(
      { phoneNumber },
      {
        $set: payload,
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
    const member = await collection.findOne({ phoneNumber });
    return member ? { ok: true, member: mapMemberDoc(member) } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save member" };
  }
}

export async function bulkUpsertMembers(inputs: MemberInput[]) {
  const collection = await membersCollection();
  const now = new Date();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let index = 0; index < inputs.length; index += 1) {
    const item = inputs[index];
    const phoneNumber = normalizePhoneNumber(item.contactNumber ?? item.phoneNumber ?? "");
    if (!phoneNumber || phoneNumber.length < 10) {
      skipped += 1;
      errors.push(`Row ${index + 2}: invalid contact number`);
      continue;
    }

    const exists = await collection.countDocuments({ phoneNumber }, { limit: 1 });
    const result = await upsertMember({ ...item, phoneNumber, source: "upload" });
    if (!result.ok) {
      skipped += 1;
      errors.push(`Row ${index + 2}: ${result.error ?? "save failed"}`);
      continue;
    }

    if (exists > 0) {
      updated += 1;
    } else {
      inserted += 1;
    }
  }

  await collection.updateMany(
    { createdAt: { $exists: false } },
    { $set: { createdAt: now } }
  );

  return { inserted, updated, skipped, errors };
}

export async function listMembers(filters: MemberFilters = {}): Promise<MemberRecord[]> {
  const collection = await membersCollection();
  const query: Filter<MemberDoc> = {};
  const andFilters: Filter<MemberDoc>[] = [];

  if (filters.q) {
    const regex = buildRegexFilter(filters.q);
    andFilters.push({
      $or: [
        { name: regex },
        { membershipNumber: regex },
        { phoneNumber: regex },
        { vehicleNumber: regex },
        { place: regex },
        { address: regex },
        { bloodGroup: regex },
        { vehicleColor: regex },
        { dateOfBirth: regex },
      ],
    });
  }

  const filterMap: Array<[keyof MemberFilters, keyof MemberDoc]> = [
    ["name", "name"],
    ["membershipNumber", "membershipNumber"],
    ["contactNumber", "phoneNumber"],
    ["vehicleNumber", "vehicleNumber"],
    ["vehicleColor", "vehicleColor"],
    ["place", "place"],
    ["address", "address"],
    ["bloodGroup", "bloodGroup"],
    ["dateOfBirth", "dateOfBirth"],
  ];

  for (const [filterKey, docKey] of filterMap) {
    const value = cleanText(filters[filterKey]);
    if (value) {
      andFilters.push({ [docKey]: buildRegexFilter(value) } as Filter<MemberDoc>);
    }
  }

  if (andFilters.length === 1) {
    Object.assign(query, andFilters[0]);
  } else if (andFilters.length > 1) {
    query.$and = andFilters;
  }

  const docs = await collection
    .find(query)
    .sort({ updatedAt: -1, name: 1, phoneNumber: 1 })
    .limit(1000)
    .toArray();

  return docs.map(mapMemberDoc);
}

export async function removeMember(phoneNumber: string): Promise<{ ok: boolean; error?: string }> {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) return { ok: false, error: "Invalid number" };
  const collection = await membersCollection();
  try {
    const result = await collection.deleteOne({ phoneNumber: normalized });
    if (result.deletedCount === 0) {
      return { ok: false, error: "Member not found" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to remove member" };
  }
}
