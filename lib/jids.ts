import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const JIDS_FILE = path.join(DATA_DIR, "jids.json");

export interface StoredJids {
  appreciationGroupJid: string;
  escalationGroupJid: string;
  birthdayGroupJid: string;
}

const defaults: StoredJids = {
  appreciationGroupJid: "",
  escalationGroupJid: "",
  birthdayGroupJid: "",
};

export async function getJids(): Promise<StoredJids> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(JIDS_FILE, "utf-8");
    const data = JSON.parse(raw) as Partial<StoredJids>;
    return { ...defaults, ...data };
  } catch {
    return { ...defaults };
  }
}

export async function saveJids(jids: Partial<StoredJids>): Promise<StoredJids> {
  await mkdir(DATA_DIR, { recursive: true });
  const current = await getJids();
  const updated = { ...current, ...jids };
  await writeFile(JIDS_FILE, JSON.stringify(updated, null, 2), "utf-8");
  return updated;
}
