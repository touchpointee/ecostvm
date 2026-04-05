import { ObjectId } from "mongodb";
import { getDb } from "./mongo";

const COLLECTION = "upload_logs";

export type UploadLog = {
  id: string;
  fileName: string;
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  uploadedAt: string;
};

type UploadLogDoc = {
  _id: ObjectId;
  fileName: string;
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  uploadedAt: Date;
};

export async function saveUploadLog(data: {
  fileName: string;
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}): Promise<void> {
  const db = await getDb();
  await db.collection<Omit<UploadLogDoc, "_id">>(COLLECTION).insertOne({
    ...data,
    uploadedAt: new Date(),
  });
}

export async function listUploadLogs(limit = 50): Promise<UploadLog[]> {
  const db = await getDb();
  const docs = await db
    .collection<UploadLogDoc>(COLLECTION)
    .find()
    .sort({ uploadedAt: -1 })
    .limit(limit)
    .toArray();

  return docs.map((doc) => ({
    id: doc._id.toString(),
    fileName: doc.fileName,
    totalRows: doc.totalRows,
    inserted: doc.inserted,
    updated: doc.updated,
    skipped: doc.skipped,
    errors: doc.errors ?? [],
    uploadedAt: doc.uploadedAt.toISOString(),
  }));
}
