/**
 * MongoDB-backed RemoteAuth store for whatsapp-web.js.
 *
 * whatsapp-web.js zips the Puppeteer userDataDir and hands us the Buffer.
 * We store it as a base64 string in MongoDB and extract it on the next start,
 * so the browser session (cookies / keys) survives container restarts.
 */

import AdmZip from "adm-zip";
import { getDb } from "./mongo";

const COLLECTION = "whatsapp_sessions";

interface SessionDoc {
  session: string;
  data: string; // base64-encoded zip
  updatedAt: Date;
}

export class MongoSessionStore {
  async sessionExists({ session }: { session: string }): Promise<boolean> {
    const db = await getDb();
    const doc = await db.collection<SessionDoc>(COLLECTION).findOne({ session });
    return !!doc;
  }

  async save({ session, data }: { session: string; data: Buffer }): Promise<void> {
    const db = await getDb();
    await db.collection<SessionDoc>(COLLECTION).updateOne(
      { session },
      {
        $set: {
          session,
          data: data.toString("base64"),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
    console.log(`[whatsapp] session "${session}" saved to MongoDB`);
  }

  async extract({ session, path: destPath }: { session: string; path: string }): Promise<void> {
    const db = await getDb();
    const doc = await db.collection<SessionDoc>(COLLECTION).findOne({ session });
    if (!doc) throw new Error(`Session "${session}" not found in MongoDB`);

    const buffer = Buffer.from(doc.data, "base64");
    const zip = new AdmZip(buffer);
    zip.extractAllTo(destPath, /* overwrite */ true);
    console.log(`[whatsapp] session "${session}" restored from MongoDB to ${destPath}`);
  }

  async delete({ session }: { session: string }): Promise<void> {
    const db = await getDb();
    await db.collection<SessionDoc>(COLLECTION).deleteOne({ session });
    console.log(`[whatsapp] session "${session}" deleted from MongoDB`);
  }
}
