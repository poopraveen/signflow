import { getDb } from "@/lib/mongodb";
import type { TenantEmailBranding } from "@/lib/types";

const COLLECTION = "tenantEmailBranding";

let indexesEnsured = false;

async function ensureIndexes(): Promise<void> {
  if (indexesEnsured) return;
  const db = await getDb();
  await db.collection(COLLECTION).createIndex({ ownerUserId: 1 }, { unique: true });
  indexesEnsured = true;
}

function fromDoc(doc: Record<string, unknown>): TenantEmailBranding {
  const updatedAt =
    doc.updatedAt instanceof Date
      ? doc.updatedAt.toISOString()
      : String(doc.updatedAt ?? new Date().toISOString());
  const base: TenantEmailBranding = {
    ownerUserId: doc.ownerUserId as string,
    updatedAt,
  };
  if (typeof doc.companyName === "string" && doc.companyName) base.companyName = doc.companyName;
  if (typeof doc.logoUrl === "string" && doc.logoUrl) base.logoUrl = doc.logoUrl;
  if (typeof doc.primaryColor === "string" && doc.primaryColor) base.primaryColor = doc.primaryColor;
  if (typeof doc.accentColor === "string" && doc.accentColor) base.accentColor = doc.accentColor;
  if (typeof doc.introText === "string" && doc.introText) base.introText = doc.introText;
  if (typeof doc.footerNote === "string" && doc.footerNote) base.footerNote = doc.footerNote;
  if (doc.useCustomHtml === true) base.useCustomHtml = true;
  if (typeof doc.customHtml === "string" && doc.customHtml) base.customHtml = doc.customHtml;
  return base;
}

export async function getTenantEmailBranding(
  ownerUserId: string,
): Promise<TenantEmailBranding | null> {
  if (!ownerUserId) return null;
  await ensureIndexes();
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ ownerUserId });
  return doc ? fromDoc(doc as Record<string, unknown>) : null;
}

/** Persists the full branding record for this tenant (replaces previous). */
export async function saveTenantEmailBranding(
  ownerUserId: string,
  data: Omit<TenantEmailBranding, "ownerUserId" | "updatedAt">,
): Promise<TenantEmailBranding> {
  await ensureIndexes();
  const db = await getDb();
  const doc: Record<string, unknown> = {
    ownerUserId,
    updatedAt: new Date(),
  };
  if (data.companyName) doc.companyName = data.companyName;
  if (data.logoUrl) doc.logoUrl = data.logoUrl;
  if (data.primaryColor) doc.primaryColor = data.primaryColor;
  if (data.accentColor) doc.accentColor = data.accentColor;
  if (data.introText) doc.introText = data.introText;
  if (data.footerNote) doc.footerNote = data.footerNote;
  if (data.useCustomHtml === true) {
    doc.useCustomHtml = true;
    if (data.customHtml) doc.customHtml = data.customHtml;
  }
  await db.collection(COLLECTION).replaceOne({ ownerUserId }, doc, { upsert: true });
  const saved = await db.collection(COLLECTION).findOne({ ownerUserId });
  if (!saved) throw new Error("Failed to save branding");
  return fromDoc(saved as Record<string, unknown>);
}
