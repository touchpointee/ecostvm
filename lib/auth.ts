import { cookies } from "next/headers";
import { getDb } from "./mongo";
import { normalizePhoneNumber, upsertMember, listMembers, removeMember } from "./members";

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
  return normalizePhoneNumber(value);
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

export async function isBlocked(phoneNumber: string): Promise<boolean> {
  const normalized = normalizeNumber(phoneNumber);
  if (!normalized) return false;
  const db = await getDb();
  const member = await db.collection("logins").findOne({ phoneNumber: normalized });
  return !!member?.isBlocked;
}

export async function addLogin(phoneNumber: string): Promise<{ ok: boolean; error?: string }> {
  const result = await upsertMember({ contactNumber: phoneNumber, source: "bootstrap" });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function removeLogin(phoneNumber: string): Promise<{ ok: boolean; error?: string }> {
  return removeMember(phoneNumber);
}

export async function listLogins(): Promise<string[]> {
  const { items } = await listMembers({ limit: 0 });
  return items.map((member) => member.contactNumber).filter((value) => value.length > 0);
}

export { COOKIE_NAME, MAX_AGE };
