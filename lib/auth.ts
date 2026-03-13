import { cookies } from "next/headers";
import { getDb } from "./mongo";

const COOKIE_NAME = "ecostvm_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET must be set and at least 16 characters");
  }
  return secret;
}

function normalizeNumber(value: string): string {
  return value.replace(/\D/g, "").trim();
}

/** Sign a value with HMAC (Node server only). */
function sign(value: string): string {
  const crypto = require("crypto");
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

/** Verify signed value and return payload or null. */
function verify(signed: string): string | null {
  const i = signed.lastIndexOf(".");
  if (i === -1) return null;
  const value = signed.slice(0, i);
  const sig = signed.slice(i + 1);
  try {
    if (sign(value) !== sig) return null;
    return value;
  } catch {
    return null;
  }
}

export function createSessionCookie(phoneNumber: string): string {
  const normalized = normalizeNumber(phoneNumber);
  if (!normalized) throw new Error("Invalid number");
  const payload = normalized;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function parseSessionCookie(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  return verify(cookieValue.trim());
}

/** Get current session phone number from cookies (server). Returns null if invalid or not in DB. */
export async function getSession(): Promise<{ phoneNumber: string } | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  const phoneNumber = parseSessionCookie(raw);
  if (!phoneNumber) return null;
  const db = await getDb();
  const exists = await db.collection("logins").findOne({ phoneNumber });
  if (!exists) return null;
  return { phoneNumber };
}

/** Check if a phone number is in the allowed logins list. */
export async function isAllowedNumber(phoneNumber: string): Promise<boolean> {
  const normalized = normalizeNumber(phoneNumber);
  if (!normalized) return false;
  const db = await getDb();
  const count = await db.collection("logins").countDocuments({ phoneNumber: normalized });
  return count > 0;
}

export async function addLogin(phoneNumber: string): Promise<{ ok: boolean; error?: string }> {
  const normalized = normalizeNumber(phoneNumber);
  if (!normalized) return { ok: false, error: "Invalid number" };
  if (normalized.length < 10) return { ok: false, error: "Number too short" };
  const db = await getDb();
  try {
    await db.collection("logins").updateOne(
      { phoneNumber: normalized },
      { $set: { phoneNumber: normalized, updatedAt: new Date() } },
      { upsert: true }
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to add" };
  }
}

export async function removeLogin(phoneNumber: string): Promise<{ ok: boolean; error?: string }> {
  const normalized = normalizeNumber(phoneNumber);
  if (!normalized) return { ok: false, error: "Invalid number" };
  const db = await getDb();
  try {
    const result = await db.collection("logins").deleteOne({ phoneNumber: normalized });
    return { ok: result.deletedCount > 0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to remove" };
  }
}

export async function listLogins(): Promise<string[]> {
  const db = await getDb();
  const docs = await db
    .collection<{ phoneNumber?: unknown }>("logins")
    .find({})
    .sort({ phoneNumber: 1 })
    .toArray();
  return docs
    .map((d) => (typeof d.phoneNumber === "string" ? d.phoneNumber : ""))
    .filter((v) => v.length > 0);
}

export { COOKIE_NAME, MAX_AGE };
