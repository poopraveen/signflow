import { GridFSBucket } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { Envelope } from "@/lib/types";

const COLLECTION = "envelopes";
const PDF_BUCKET = "envelopePdf";

let indexesEnsured = false;

async function ensureIndexes(): Promise<void> {
  if (indexesEnsured) return;
  const db = await getDb();
  await db.collection(COLLECTION).createIndex({ id: 1 }, { unique: true });
  indexesEnsured = true;
}

function toEnvelope(doc: Record<string, unknown>): Envelope {
  const createdAt =
    doc.createdAt instanceof Date
      ? doc.createdAt.toISOString()
      : String(doc.createdAt ?? "");
  const completedRaw = doc.completedAt;
  const completedAt =
    completedRaw instanceof Date
      ? completedRaw.toISOString()
      : completedRaw
        ? String(completedRaw)
        : undefined;
  return {
    id: doc.id as string,
    title: doc.title as string,
    status: doc.status as Envelope["status"],
    signers: doc.signers as Envelope["signers"],
    fields: doc.fields as Envelope["fields"],
    createdAt,
    completedAt,
  };
}

export async function listEnvelopes(): Promise<Envelope[]> {
  await ensureIndexes();
  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((d) => toEnvelope(d as Record<string, unknown>));
}

export async function findEnvelopeById(id: string): Promise<Envelope | null> {
  await ensureIndexes();
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ id });
  return doc ? toEnvelope(doc as Record<string, unknown>) : null;
}

export async function insertEnvelope(envelope: Envelope, pdfBuffer: Buffer): Promise<void> {
  await ensureIndexes();
  const db = await getDb();
  const bucket = new GridFSBucket(db, { bucketName: PDF_BUCKET });
  await new Promise<void>((resolve, reject) => {
    const upload = bucket.openUploadStream(`${envelope.id}.pdf`, {
      metadata: { envelopeId: envelope.id },
    });
    upload.on("finish", () => resolve());
    upload.on("error", reject);
    upload.end(pdfBuffer);
  });
  await db.collection(COLLECTION).insertOne({
    id: envelope.id,
    title: envelope.title,
    status: envelope.status,
    signers: envelope.signers,
    fields: envelope.fields,
    createdAt: new Date(envelope.createdAt),
    completedAt: envelope.completedAt ? new Date(envelope.completedAt) : undefined,
  });
}

export async function replaceEnvelope(envelope: Envelope): Promise<void> {
  await ensureIndexes();
  const db = await getDb();
  const r = await db.collection(COLLECTION).updateOne(
    { id: envelope.id },
    {
      $set: {
        title: envelope.title,
        status: envelope.status,
        signers: envelope.signers,
        fields: envelope.fields,
        completedAt: envelope.completedAt ? new Date(envelope.completedAt) : null,
      },
    },
  );
  if (r.matchedCount === 0) {
    throw new Error("Envelope not found");
  }
}

export async function deleteEnvelope(id: string): Promise<void> {
  await ensureIndexes();
  const db = await getDb();
  const bucket = new GridFSBucket(db, { bucketName: PDF_BUCKET });
  const files = await bucket.find({ filename: `${id}.pdf` }).toArray();
  for (const f of files) {
    await bucket.delete(f._id);
  }
  await db.collection(COLLECTION).deleteOne({ id });
}

export async function openPdfDownloadStream(
  id: string,
): Promise<NodeJS.ReadableStream | null> {
  await ensureIndexes();
  const db = await getDb();
  const bucket = new GridFSBucket(db, { bucketName: PDF_BUCKET });
  const files = await bucket
    .find({ filename: `${id}.pdf` })
    .sort({ uploadDate: -1 })
    .limit(1)
    .toArray();
  if (files.length === 0) return null;
  return bucket.openDownloadStream(files[0]._id);
}
