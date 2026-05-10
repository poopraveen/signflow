import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import { getAuthSecret } from "@/lib/auth-env";
import { getDb } from "@/lib/mongodb";

const COLLECTION = "apiKeys";

let indexesEnsured = false;

async function ensureIndexes(): Promise<void> {
  if (indexesEnsured) return;
  const db = await getDb();
  await db.collection(COLLECTION).createIndex({ keyHash: 1 }, { unique: true });
  await db.collection(COLLECTION).createIndex({ userId: 1, createdAt: -1 });
  indexesEnsured = true;
}

function authPepper(): string {
  const s = getAuthSecret();
  if (!s) {
    throw new Error("AUTH_SECRET (or NEXTAUTH_SECRET) is required for API keys");
  }
  return s;
}

function hashApiKey(rawKey: string): string {
  return createHash("sha256")
    .update(`signflow-api-v1:${rawKey}:${authPepper()}`, "utf8")
    .digest("hex");
}

export type ApiKeyRecord = {
  id: string;
  userId: string;
  label: string;
  keyHash: string;
  keyPreview: string;
  createdAt: Date;
};

export async function createApiKey(
  userId: string,
  label: string,
): Promise<{ id: string; rawKey: string; keyPreview: string }> {
  await ensureIndexes();
  const rawKey = `sfk_${nanoid(32)}`;
  const keyHash = hashApiKey(rawKey);
  const keyPreview = `${rawKey.slice(0, 12)}…`;
  const id = nanoid();
  const db = await getDb();
  await db.collection(COLLECTION).insertOne({
    id,
    userId,
    label: label.trim() || "API key",
    keyHash,
    keyPreview,
    createdAt: new Date(),
  });
  return { id, rawKey, keyPreview };
}

export type ApiKeyListItem = {
  id: string;
  label: string;
  keyPreview: string;
  createdAt: string;
};

export async function listApiKeysForUser(userId: string): Promise<ApiKeyListItem[]> {
  await ensureIndexes();
  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((d) => {
    const doc = d as Record<string, unknown>;
    const created = doc.createdAt instanceof Date ? doc.createdAt : new Date();
    return {
      id: String(doc.id),
      label: String(doc.label ?? ""),
      keyPreview: String(doc.keyPreview ?? ""),
      createdAt: created.toISOString(),
    };
  });
}

export async function deleteApiKey(userId: string, keyId: string): Promise<boolean> {
  await ensureIndexes();
  const db = await getDb();
  const r = await db.collection(COLLECTION).deleteOne({ id: keyId, userId });
  return r.deletedCount > 0;
}

/** Resolve SignFlow API key to owning user (Google `sub`). */
export async function validateApiKey(rawKey: string | undefined): Promise<string | null> {
  if (!rawKey?.startsWith("sfk_") || rawKey.length < 12) return null;
  await ensureIndexes();
  const keyHash = hashApiKey(rawKey.trim());
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ keyHash });
  if (!doc) return null;
  return String((doc as Record<string, unknown>).userId ?? "") || null;
}
