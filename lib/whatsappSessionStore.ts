/**
 * MongoDB-backed RemoteAuth store for whatsapp-web.js.
 *
 * RemoteAuth saves a `${session}.zip` file on disk and asks the custom store
 * to persist / restore that zip blob by session name.
 */

import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";
import { getDb } from "./mongo";

const COLLECTION = "whatsapp_sessions";

interface SessionDoc {
  session: string;
  data: string; // base64-encoded zip
  updatedAt: Date;
}

export class MongoSessionStore {
  private normalizeSession(session: string): string {
    return path.basename(session);
  }

  async sessionExists({ session }: { session: string }): Promise<boolean> {
    const db = await getDb();
    const doc = await db.collection<SessionDoc>(COLLECTION).findOne({
      session: this.normalizeSession(session),
    });
    return !!doc;
  }

  async save({ session }: { session: string }): Promise<void> {
    const db = await getDb();
    const normalizedSession = this.normalizeSession(session);
    const zipPath = `${session}.zip`;
    const data = await readFile(zipPath);
    await db.collection<SessionDoc>(COLLECTION).updateOne(
      { session: normalizedSession },
      {
        $set: {
          session: normalizedSession,
          data: data.toString("base64"),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
    console.log(`[whatsapp] session "${normalizedSession}" saved to MongoDB`);
  }

  async extract({ session, path: destPath }: { session: string; path: string }): Promise<void> {
    const db = await getDb();
    const normalizedSession = this.normalizeSession(session);
    const doc = await db.collection<SessionDoc>(COLLECTION).findOne({
      session: normalizedSession,
    });
    if (!doc) throw new Error(`Session "${normalizedSession}" not found in MongoDB`);

    const buffer = Buffer.from(doc.data, "base64");
    await mkdir(path.dirname(destPath), { recursive: true });
    await writeFile(destPath, buffer);
    console.log(`[whatsapp] session "${normalizedSession}" restored from MongoDB to ${destPath}`);
  }

  async delete({ session }: { session: string }): Promise<void> {
    const db = await getDb();
    const normalizedSession = this.normalizeSession(session);
    await db.collection<SessionDoc>(COLLECTION).deleteOne({ session: normalizedSession });
    console.log(`[whatsapp] session "${normalizedSession}" deleted from MongoDB`);
  }
}
