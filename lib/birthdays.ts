import { Filter, ObjectId } from "mongodb";
import { getDb } from "./mongo";
import { getJids } from "./jids";
import { renderBirthdayCard } from "./birthdayCard";
import { connect, sendComposing, sendImageToGroupWithRetry } from "./whatsapp";

const BIRTHDAY_TIMEZONE = process.env.BIRTHDAY_TIMEZONE || "Asia/Calcutta";
const BIRTHDAY_COLLECTION = "birthdayWishLogs";

type BirthdayMemberDoc = {
  _id: ObjectId;
  name?: string;
  membershipNumber?: string;
  phoneNumber?: string;
  contactNumber?: string;
  dateOfBirth?: string;
};

type BirthdayWishLogDoc = {
  _id?: ObjectId;
  memberId: ObjectId;
  birthdayKey: string;
  name: string;
  membershipNumber: string;
  dateOfBirth: string;
  groupJid: string;
  sentAt: Date;
};

type BirthdaySendOptions = {
  force?: boolean;
};

export type BirthdaySendResult = {
  sent: number;
  skipped: number;
  errors: string[];
};

export type UpcomingBirthday = {
  id: string;
  name: string;
  membershipNumber: string;
  dateOfBirth: string;
  nextBirthday: string;
  daysUntil: number;
};

let started = false;

function getLocalDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BIRTHDAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    key: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

export function parseBirthdayMonthDay(value: string): { month: number; day: number } | null {
  const raw = value.trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return { month: Number(isoMatch[2]), day: Number(isoMatch[3]) };
  }

  const slashMatch = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    if (first > 12 && second <= 12) {
      return { month: second, day: first };
    }
    return { month: first, day: second };
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    month: parsed.getUTCMonth() + 1,
    day: parsed.getUTCDate(),
  };
}

function normalizeMemberName(name: string | undefined): string {
  return (name ?? "").trim() || "Member";
}

function getNextBirthdayDate(month: number, day: number, from = new Date()): Date {
  const { year } = getLocalDateParts(from);
  const currentYearBirthday = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const { month: currentMonth, day: currentDay } = getLocalDateParts(from);

  if (month < currentMonth || (month === currentMonth && day < currentDay)) {
    return new Date(Date.UTC(year + 1, month - 1, day, 0, 0, 0));
  }

  return currentYearBirthday;
}

function getDaysUntil(date: Date, from = new Date()): number {
  const today = getLocalDateParts(from);
  const todayDate = Date.UTC(today.year, today.month - 1, today.day, 0, 0, 0);
  const targetDate = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0);
  return Math.round((targetDate - todayDate) / 86400000);
}

async function ensureBirthdayWishIndexes() {
  const db = await getDb();
  await db
    .collection<BirthdayWishLogDoc>(BIRTHDAY_COLLECTION)
    .createIndex({ memberId: 1, birthdayKey: 1 }, { unique: true });
}

async function listMembersWithBirthday(month: number, day: number): Promise<BirthdayMemberDoc[]> {
  const db = await getDb();
  const docs = await db
    .collection<BirthdayMemberDoc>("logins")
    .find({
      dateOfBirth: { $exists: true, $ne: "" },
    } as Filter<BirthdayMemberDoc>)
    .toArray();

  return docs.filter((doc) => {
    const birthday = parseBirthdayMonthDay(doc.dateOfBirth ?? "");
    return birthday?.month === month && birthday?.day === day;
  });
}

async function wasBirthdayWishSent(memberId: ObjectId, birthdayKey: string): Promise<boolean> {
  const db = await getDb();
  const existing = await db
    .collection<BirthdayWishLogDoc>(BIRTHDAY_COLLECTION)
    .countDocuments({ memberId, birthdayKey }, { limit: 1 });
  return existing > 0;
}

async function recordBirthdayWish(doc: BirthdayWishLogDoc) {
  const db = await getDb();
  await db.collection<BirthdayWishLogDoc>(BIRTHDAY_COLLECTION).updateOne(
    { memberId: doc.memberId, birthdayKey: doc.birthdayKey },
    { $setOnInsert: doc },
    { upsert: true }
  );
}

function buildBirthdayCaption(name: string): string {
  return `Happy Birthday ${name}! Wish from EcoSport Owners Club.`;
}

export async function sendBirthdayWishes(options: BirthdaySendOptions = {}): Promise<BirthdaySendResult> {
  const { month, day, key: birthdayKey } = getLocalDateParts();
  const result: BirthdaySendResult = { sent: 0, skipped: 0, errors: [] };

  await ensureBirthdayWishIndexes();

  const jids = await getJids();
  const groupJid = jids.birthdayGroupJid.trim();
  if (!groupJid) {
    return {
      sent: 0,
      skipped: 0,
      errors: ["Birthday group JID is not configured."],
    };
  }

  const members = await listMembersWithBirthday(month, day);
  if (members.length === 0) {
    return result;
  }

  // Ensure a fresh, working WhatsApp connection
  try {
    await connect();
  } catch (e) {
    result.errors.push(`WhatsApp connect failed: ${e instanceof Error ? e.message : String(e)}`);
    return result;
  }

  for (const member of members) {
    try {
      if (!options.force && (await wasBirthdayWishSent(member._id, birthdayKey))) {
        result.skipped += 1;
        continue;
      }

      const name = normalizeMemberName(member.name);
      const cardBuffer = await renderBirthdayCard(name);
      await sendComposing(groupJid, 1500);
      await sendImageToGroupWithRetry(groupJid, cardBuffer, "birthday-wish.png", buildBirthdayCaption(name));
      await recordBirthdayWish({
        memberId: member._id,
        birthdayKey,
        name,
        membershipNumber: member.membershipNumber ?? "",
        dateOfBirth: member.dateOfBirth ?? "",
        groupJid,
        sentAt: new Date(),
      });
      result.sent += 1;
    } catch (error) {
      const label = normalizeMemberName(member.name);
      result.errors.push(`${label}: ${error instanceof Error ? error.message : "Failed to send birthday wish"}`);
    }
  }

  return result;
}

export async function sendBirthdayTestWish(name: string): Promise<void> {
  const trimmedName = normalizeMemberName(name);
  const jids = await getJids();
  const groupJid = jids.birthdayGroupJid.trim();
  if (!groupJid) {
    throw new Error("Birthday group JID is not configured.");
  }

  const cardBuffer = await renderBirthdayCard(trimmedName);
  await connect();
  await sendComposing(groupJid, 1500);
  await sendImageToGroupWithRetry(groupJid, cardBuffer, "birthday-test.png", buildBirthdayCaption(trimmedName));
}

export async function listUpcomingBirthdays(limit = 50): Promise<UpcomingBirthday[]> {
  const db = await getDb();
  const members = await db
    .collection<BirthdayMemberDoc>("logins")
    .find({
      dateOfBirth: { $exists: true, $ne: "" },
    } as Filter<BirthdayMemberDoc>)
    .toArray();

  return members
    .map((member) => {
      const birthday = parseBirthdayMonthDay(member.dateOfBirth ?? "");
      if (!birthday) return null;
      const nextBirthday = getNextBirthdayDate(birthday.month, birthday.day);
      return {
        id: member._id.toString(),
        name: normalizeMemberName(member.name),
        membershipNumber: member.membershipNumber ?? "",
        dateOfBirth: member.dateOfBirth ?? "",
        nextBirthday: nextBirthday.toISOString().slice(0, 10),
        daysUntil: getDaysUntil(nextBirthday),
      };
    })
    .filter((item): item is UpcomingBirthday => item !== null)
    .sort((a, b) => a.daysUntil - b.daysUntil || a.membershipNumber.localeCompare(b.membershipNumber, undefined, { numeric: true }) || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function startBirthdayScheduler() {
  if (started) return;
  started = true;

  const ONE_HOUR = 60 * 60 * 1000;
  const run = () => {
    sendBirthdayWishes().catch((error) => {
      console.error("[birthdayScheduler] birthday batch failed", error);
    });
  };

  setTimeout(run, 45_000).unref?.();
  setInterval(run, ONE_HOUR).unref?.();
}
