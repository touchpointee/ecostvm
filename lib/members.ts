import { Filter, ObjectId } from "mongodb";
import { getDb } from "./mongo";

export type MemberInput = {
  id?: string;
  name?: string;
  membershipNumber?: string;
  contactNumber?: string;
  phoneNumber?: string;
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
  isBlocked?: boolean;
  source?: "manual" | "upload" | "bootstrap" | "registration";
};

export type MemberRecord = {
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
  isBlocked: boolean;
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
  isBlocked?: boolean;
  source?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type MemberFilters = {
  q?: string;
  name?: string;
  membershipNumber?: string;
  contactNumber?: string;
  model?: string;
  purchaseMonth?: string;
  manufacturingYear?: string;
  variant?: string;
  vehicleNumber?: string;
  vehicleColor?: string;
  place?: string;
  address?: string;
  occupation?: string;
  mailId?: string;
  bloodGroup?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  suggestions?: string;
  page?: number;
  limit?: number;
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

export function normalizeMembershipNumber(value: unknown): string {
  const raw = cleanText(value);
  if (!raw) return "";
  // Handle scientific notation (e.g. "1.23E3" -> "1230") and decimals ("123.0" -> "123")
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber >= 0) {
    return String(Math.floor(asNumber));
  }
  // Fallback: strip any decimal portion
  return raw.replace(/\.\d+$/, "");
}

export function validateVehicleNumber(value: string): boolean {
  // Normalize: Uppercase and remove all spaces/hyphens
  const clean = value.replace(/[ -]/g, "").toUpperCase();
  
  // Standard Indian: State(2) + RTO(2) + Optional Series(1-2) + Number(4)
  // Example: KL01AB1234, DL3C1234
  const standardRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,2}[0-9]{4}$/;
  
  // BH Series: Year(2) + BH + Number(4) + Series(1-2)
  // Example: 22BH1234AA
  const bhRegex = /^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/;
  
  return standardRegex.test(clean) || bhRegex.test(clean);
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
    isBlocked: !!doc.isBlocked,
    createdAt: doc.createdAt?.toISOString() ?? null,
    updatedAt: doc.updatedAt?.toISOString() ?? null,
    source: doc.source ?? "manual",
  };
}

function buildRegexFilter(value: string) {
  return { $regex: value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
}

async function findMemberByMembershipNumber(membershipNumber: string) {
  const normalizedMembershipNumber = normalizeLooseText(membershipNumber);
  if (!normalizedMembershipNumber) return null;

  const collection = await membersCollection();
  return collection.findOne({
    membershipNumber: normalizedMembershipNumber,
  });
}

export async function getMemberById(id: string): Promise<MemberRecord | null> {
  let objId: ObjectId;
  try {
    objId = new ObjectId(id);
  } catch {
    return null;
  }
  const collection = await membersCollection();
  const doc = await collection.findOne({ _id: objId });
  return doc ? mapMemberDoc(doc) : null;
}

export async function ensureMemberIndexes() {
  const collection = await membersCollection();
  await Promise.all([
    collection.createIndex({ phoneNumber: 1 }, { unique: true }),
    collection.createIndex({ membershipNumber: 1 }),
    collection.createIndex({ name: 1 }),
    collection.createIndex({ vehicleNumber: 1 }),
    collection.createIndex({ place: 1 }),
    collection.createIndex({ bloodGroup: 1 }),
  ]);
}

export async function upsertMember(input: MemberInput, allowUpdate: boolean = true): Promise<{ ok: boolean; error?: string; member?: MemberRecord }> {
  const collection = await membersCollection();
  const now = new Date();

  // Clean and Validate Mandatory Fields
  const name = normalizeLooseText(input.name);
  const phoneNumber = normalizePhoneNumber(input.contactNumber ?? input.phoneNumber ?? "");
  const vehicleNumberInput = normalizeLooseText(input.vehicleNumber).toUpperCase();
  const dateOfBirth = normalizeDate(input.dateOfBirth);
  const place = normalizeLooseText(input.place);
  const address = normalizeLooseText(input.address);
  const rawMembershipNumber = normalizeMembershipNumber(input.membershipNumber);

  if (!name) return { ok: false, error: "Name is required." };
  if (!phoneNumber || phoneNumber.length < 10) {
    return { ok: false, error: "Enter a valid contact number with at least 10 digits." };
  }
  if (!vehicleNumberInput) return { ok: false, error: "Vehicle number is required." };
  if (!dateOfBirth) return { ok: false, error: "Date of birth is required." };
  if (!place) return { ok: false, error: "Place is required." };
  if (!address) return { ok: false, error: "Address is required." };

  // Validate vehicle number format
  if (!validateVehicleNumber(vehicleNumberInput)) {
    return { ok: false, error: "Invalid vehicle number format (e.g., KL01AB1234 or 21BH1234AA)." };
  }

  // If ID is provided, it's a direct update
  if (input.id) {
    let objId;
    try {
      objId = new ObjectId(input.id);
    } catch {
      return { ok: false, error: "Invalid record ID." };
    }

    const existingById = await collection.findOne({ _id: objId });
    if (!existingById) {
      return { ok: false, error: "Member record not found." };
    }

    // Check if new phonenumber is taken by someone else
    const takenByOther = await collection.findOne({ phoneNumber, _id: { $ne: objId } });
    if (takenByOther) {
      return { ok: false, error: "This contact number is already registered to another member." };
    }

    // Check if membership number is taken by someone else
    if (rawMembershipNumber) {
      const memTakenByOther = await collection.findOne({ membershipNumber: rawMembershipNumber, _id: { $ne: objId } });
      if (memTakenByOther) {
        return { ok: false, error: "This membership number already exists." };
      }
    }

    const payload = {
      phoneNumber,
      contactNumber: phoneNumber,
      name,
      membershipNumber: rawMembershipNumber,
      model: normalizeLooseText(input.model),
      purchaseMonth: normalizeLooseText(input.purchaseMonth),
      manufacturingYear: normalizeLooseText(input.manufacturingYear),
      variant: normalizeLooseText(input.variant),
      vehicleColor: normalizeLooseText(input.vehicleColor),
      vehicleNumber: vehicleNumberInput,
      place,
      address,
      occupation: normalizeLooseText(input.occupation),
      mailId: normalizeLooseText(input.mailId),
      bloodGroup: normalizeLooseText(input.bloodGroup).toUpperCase(),
      dateOfBirth,
      emergencyContact: normalizeLooseText(input.emergencyContact),
      suggestions: cleanText(input.suggestions),
      ...(input.isBlocked !== undefined ? { isBlocked: input.isBlocked } : {}),
      source: input.source ?? existingById.source ?? "manual",
      updatedAt: now,
    };

    await collection.updateOne({ _id: objId }, { $set: payload });
    const updated = await collection.findOne({ _id: objId });
    return updated ? { ok: true, member: mapMemberDoc(updated) } : { ok: true };
  }

  // No ID provided -> Old behavior or literal "Add New"
  if (!allowUpdate) {
    const existing = await collection.findOne({ phoneNumber });
    if (existing) {
      return { ok: false, error: "This contact number is already registered to another member." };
    }
  }

  let finalMembershipNumber = rawMembershipNumber;
  if (!finalMembershipNumber) {
    finalMembershipNumber = await getNextMembershipNumber();
  } else {
    const existingWithNum = await collection.findOne({ membershipNumber: finalMembershipNumber });
    if (existingWithNum && existingWithNum.phoneNumber !== phoneNumber) {
      // Taken by another member -> allocate new one
      finalMembershipNumber = await getNextMembershipNumber();
    }
  }

  // const now = new Date(); // Already declared above
  const payload = {
    phoneNumber,
    contactNumber: phoneNumber,
    name,
    membershipNumber: finalMembershipNumber,
    model: normalizeLooseText(input.model),
    purchaseMonth: normalizeLooseText(input.purchaseMonth),
    manufacturingYear: normalizeLooseText(input.manufacturingYear),
    variant: normalizeLooseText(input.variant),
    vehicleColor: normalizeLooseText(input.vehicleColor),
    vehicleNumber: vehicleNumberInput,
    place,
    address,
    occupation: normalizeLooseText(input.occupation),
    mailId: normalizeLooseText(input.mailId),
    bloodGroup: normalizeLooseText(input.bloodGroup).toUpperCase(),
    dateOfBirth,
      emergencyContact: normalizeLooseText(input.emergencyContact),
      suggestions: cleanText(input.suggestions),
      ...(input.isBlocked !== undefined ? { isBlocked: input.isBlocked } : {}),
      source: input.source ?? "manual",
    updatedAt: now,
  };

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
    const nameStr = item.name ? `${item.name} ` : "";
    const membershipNumber = normalizeMembershipNumber(item.membershipNumber);

    if (!membershipNumber) {
      skipped += 1;
      errors.push(`Row ${index + 2}: ${nameStr.trim() || "(unnamed)"} — membership number is required for upload`);
      continue;
    }

    // Use membership number as primary key: find existing record
    const existing = await collection.findOne({ membershipNumber });

    if (existing) {
      // UPDATE: pass the existing phone number as fallback so validation passes
      const phoneNumber = normalizePhoneNumber(item.contactNumber ?? item.phoneNumber ?? "");
      const result = await upsertMember({
        ...item,
        id: existing._id.toString(),
        membershipNumber,
        contactNumber: phoneNumber || existing.contactNumber || existing.phoneNumber,
        source: "upload",
      });
      if (!result.ok) {
        skipped += 1;
        errors.push(`Row ${index + 2}: ${nameStr}(#${membershipNumber}) — ${result.error ?? "update failed"}`);
        continue;
      }
      updated += 1;
    } else {
      // INSERT: contact number required for new members
      const phoneNumber = normalizePhoneNumber(item.contactNumber ?? item.phoneNumber ?? "");
      if (!phoneNumber || phoneNumber.length < 10) {
        skipped += 1;
        errors.push(`Row ${index + 2}: ${nameStr}(#${membershipNumber}) — valid contact number required for new members`);
        continue;
      }
      const result = await upsertMember({ ...item, membershipNumber, contactNumber: phoneNumber, source: "upload" });
      if (!result.ok) {
        skipped += 1;
        errors.push(`Row ${index + 2}: ${nameStr}(#${membershipNumber}) — ${result.error ?? "insert failed"}`);
        continue;
      }
      inserted += 1;
    }
  }

  await collection.updateMany(
    { createdAt: { $exists: false } },
    { $set: { createdAt: now } }
  );

  return { inserted, updated, skipped, errors };
}

export async function listMembers(filters: MemberFilters = {}): Promise<{ items: MemberRecord[]; total: number }> {
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
        { occupation: regex },
        { mailId: regex },
        { variant: regex },
        { model: regex },
      ],
    });
  }

  const filterMap: Array<[keyof MemberFilters, keyof MemberDoc]> = [
    ["name", "name"],
    ["contactNumber", "phoneNumber"],
    ["model", "model"],
    ["purchaseMonth", "purchaseMonth"],
    ["manufacturingYear", "manufacturingYear"],
    ["variant", "variant"],
    ["vehicleNumber", "vehicleNumber"],
    ["vehicleColor", "vehicleColor"],
    ["place", "place"],
    ["address", "address"],
    ["occupation", "occupation"],
    ["mailId", "mailId"],
    ["bloodGroup", "bloodGroup"],
    ["dateOfBirth", "dateOfBirth"],
    ["emergencyContact", "emergencyContact"],
    ["suggestions", "suggestions"],
  ];

  for (const [filterKey, docKey] of filterMap) {
    const value = cleanText(filters[filterKey]);
    if (value) {
      andFilters.push({ [docKey]: buildRegexFilter(value) } as Filter<MemberDoc>);
    }
  }

  const exactMembershipNumber = cleanText(filters.membershipNumber);
  if (exactMembershipNumber) {
    andFilters.push({ membershipNumber: normalizeLooseText(exactMembershipNumber) });
  }

  if (andFilters.length === 1) {
    Object.assign(query, andFilters[0]);
  } else if (andFilters.length > 1) {
    query.$and = andFilters;
  }

  const pageSize = filters.limit === 0 ? 0 : (filters.limit ?? 50);
  const pageNum = Math.max(1, filters.page ?? 1);
  const skip = pageSize > 0 ? (pageNum - 1) * pageSize : 0;

  const [total, docs] = await Promise.all([
    collection.countDocuments(query),
    collection
      .find(query)
      .collation({ locale: "en", numericOrdering: true })
      .sort({ membershipNumber: 1, name: 1, phoneNumber: 1 })
      .skip(skip)
      .limit(pageSize > 0 ? pageSize : 0)
      .toArray(),
  ]);

  return { items: docs.map(mapMemberDoc), total };
}

export async function getMemberByPhoneNumber(phoneNumber: string): Promise<MemberRecord | null> {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) return null;

  const collection = await membersCollection();
  const member = await collection.findOne({ phoneNumber: normalized });
  return member ? mapMemberDoc(member) : null;
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

export async function deleteMemberById(id: string): Promise<{ ok: boolean; error?: string }> {
  let objId;
  try {
    objId = new ObjectId(id);
  } catch {
    return { ok: false, error: "Invalid ID" };
  }
  const collection = await membersCollection();
  try {
    const result = await collection.deleteOne({ _id: objId });
    if (result.deletedCount === 0) {
      return { ok: false, error: "Member not found" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Deletion failed" };
  }
}

export async function updateMemberBlockStatus(id: string, blocked: boolean): Promise<{ ok: boolean; error?: string }> {
  let objId;
  try {
    objId = new ObjectId(id);
  } catch {
    return { ok: false, error: "Invalid ID" };
  }
  const collection = await membersCollection();
  try {
    const result = await collection.updateOne({ _id: objId }, { $set: { isBlocked: blocked, updatedAt: new Date() } });
    if (result.matchedCount === 0) {
      return { ok: false, error: "Member not found" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed" };
  }
}

export async function getNextMembershipNumber(): Promise<string> {
  const collection = await membersCollection();
  const members = await collection.find({}, { projection: { membershipNumber: 1 } }).toArray();
  
  let max = 0;
  for (const m of members) {
    const memNo = m.membershipNumber;
    if (memNo) {
      // Use Number() to handle decimals like "123.0" correctly
      const num = Math.floor(Number(String(memNo)));
      if (!isNaN(num) && num > max) {
        max = num;
      }
    }
  }
  
  return String(max + 1);
}
