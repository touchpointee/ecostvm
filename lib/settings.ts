import { createHash } from "crypto";
import { getDb } from "./mongo";

const COLLECTION = "admin_settings";

// Fallback credentials if nothing has been saved to DB yet
const DEFAULT_USERNAME = "Ecostvm";
const DEFAULT_PASSWORD = "Hashmi6676";

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "ecostvm_salt").digest("hex");
}

async function settingsCollection() {
  const db = await getDb();
  return db.collection<{ key: string; value: string }>(COLLECTION);
}

export async function getAdminCredentials(): Promise<{
  username: string;
  passwordHash: string;
}> {
  const col = await settingsCollection();
  const [userDoc, passDoc] = await Promise.all([
    col.findOne({ key: "admin_username" }),
    col.findOne({ key: "admin_password_hash" }),
  ]);

  return {
    username: userDoc?.value ?? DEFAULT_USERNAME,
    passwordHash: passDoc?.value ?? hashPassword(DEFAULT_PASSWORD),
  };
}

export async function verifyAdminLogin(
  username: string,
  password: string
): Promise<boolean> {
  const creds = await getAdminCredentials();
  return username === creds.username && hashPassword(password) === creds.passwordHash;
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const creds = await getAdminCredentials();
  return hashPassword(password) === creds.passwordHash;
}

export async function getAdminUsername(): Promise<string> {
  const { username } = await getAdminCredentials();
  return username;
}

export async function updateAdminUsername(newUsername: string): Promise<void> {
  const col = await settingsCollection();
  await col.updateOne(
    { key: "admin_username" },
    { $set: { key: "admin_username", value: newUsername.trim() } },
    { upsert: true }
  );
}

export async function updateAdminPassword(newPassword: string): Promise<void> {
  const col = await settingsCollection();
  await col.updateOne(
    { key: "admin_password_hash" },
    { $set: { key: "admin_password_hash", value: hashPassword(newPassword) } },
    { upsert: true }
  );
}

// ─── Welcome message template ─────────────────────────────────────────────────
// Supported placeholders: {name} {membershipNumber} {contactNumber} {model}
//   {vehicleNumber} {place} {variant} {vehicleColor} {purchaseMonth}
//   {manufacturingYear} {bloodGroup} {dateOfBirth} {mailId} {occupation}

export const DEFAULT_WELCOME_TEMPLATE = `Welcome to EcoSport TVM! 🎉

Dear {name},

Your membership has been approved.

🪪 Membership No: {membershipNumber}
📱 Contact: {contactNumber}
🚗 Vehicle: {vehicleNumber} ({model})

We're thrilled to have you as part of the EcoSport Owners Club, Trivandrum!

– Team EcoSport TVM`;

export async function getWelcomeTemplate(): Promise<string> {
  const col = await settingsCollection();
  const doc = await col.findOne({ key: "welcome_template" });
  return doc?.value ?? DEFAULT_WELCOME_TEMPLATE;
}

export async function updateWelcomeTemplate(template: string): Promise<void> {
  const col = await settingsCollection();
  await col.updateOne(
    { key: "welcome_template" },
    { $set: { key: "welcome_template", value: template } },
    { upsert: true }
  );
}

export function renderWelcomeMessage(
  template: string,
  member: Record<string, string | undefined>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => member[key] ?? "");
}
