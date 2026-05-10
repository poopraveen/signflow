import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { sanitizeEnvelopeForClient } from "@/lib/envelope-utils";
import { validateApiKey } from "@/lib/api-key-repository";
import { executeSendEnvelope } from "@/lib/envelope-send";
import { insertEnvelope } from "@/lib/envelope-repository";
import { getMongoClient } from "@/lib/mongodb";
import type { Envelope, Field, Signer } from "@/lib/types";

export const runtime = "nodejs";

function extractApiKey(req: Request): string | null {
  const header = req.headers.get("x-api-key")?.trim();
  if (header) return header;
  const auth = req.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

type V1Signer = {
  email?: string;
  name?: string;
  order?: number;
  routingOrder?: number;
};

type V1Field = {
  pageIndex?: number;
  signerIndex?: number;
  signerEmail?: string;
  type?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

function parseV1Signers(raw: unknown): Signer[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const rows = raw as V1Signer[];
  const withOrder = rows.map((r, i) => {
    const email = String(r.email ?? "").trim().toLowerCase();
    const name = String(r.name ?? "").trim();
    const ro =
      typeof r.routingOrder === "number" && Number.isInteger(r.routingOrder) && r.routingOrder >= 1
        ? r.routingOrder
        : typeof r.order === "number" && Number.isInteger(r.order) && r.order >= 0
          ? r.order + 1
          : i + 1;
    return { email, name, sortKey: ro, origIndex: i };
  });
  for (const r of withOrder) {
    if (!r.email.includes("@") || !r.name) return null;
  }
  withOrder.sort((a, b) => a.sortKey - b.sortKey || a.origIndex - b.origIndex);
  return withOrder.map((r, order) => ({
    id: nanoid(),
    name: r.name,
    email: r.email,
    order,
  }));
}

function defaultFields(signers: Signer[]): Field[] {
  return signers.map((s, i) => ({
    id: nanoid(),
    type: "signature" as const,
    pageIndex: 0,
    signerId: s.id,
    x: 0.1,
    y: Math.max(0.06, 0.84 - i * 0.09),
    width: 0.38,
    height: 0.07,
  }));
}

function parseV1Fields(raw: unknown, signers: Signer[]): Field[] | null {
  if (raw === undefined) return null;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: Field[] = [];
  for (let i = 0; i < raw.length; i++) {
    const f = raw[i] as V1Field;
    const pageIndex =
      typeof f.pageIndex === "number" && f.pageIndex >= 0 ? Math.floor(f.pageIndex) : 0;
    const x = typeof f.x === "number" ? f.x : Number(f.x);
    const y = typeof f.y === "number" ? f.y : Number(f.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const width =
      typeof f.width === "number" && f.width > 0 ? f.width : 0.35;
    const height =
      typeof f.height === "number" && f.height > 0 ? f.height : 0.06;
    let signerId: string | undefined;
    if (typeof f.signerIndex === "number" && signers[f.signerIndex]) {
      signerId = signers[f.signerIndex].id;
    } else if (f.signerEmail) {
      const em = String(f.signerEmail).trim().toLowerCase();
      signerId = signers.find((s) => s.email === em)?.id;
    }
    if (!signerId) return null;
    const typ = f.type === "date" || f.type === "text" ? f.type : "signature";
    out.push({
      id: nanoid(),
      type: typ,
      pageIndex,
      signerId,
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y)),
      width: Math.min(1, Math.max(0.02, width)),
      height: Math.min(1, Math.max(0.02, height)),
    });
  }
  return out;
}

/**
 * Native SignFlow envelope API for third-party systems (no DocuSign).
 * Auth: `x-api-key: sfk_...` or `Authorization: Bearer sfk_...`
 */
export async function POST(req: Request) {
  const rawKey = extractApiKey(req);
  if (!rawKey) return unauthorized();

  let ownerUserId: string;
  try {
    await getMongoClient();
    ownerUserId = (await validateApiKey(rawKey)) ?? "";
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
  if (!ownerUserId) return unauthorized();

  let body: {
    title?: string;
    documentPdfBase64?: string;
    signers?: unknown;
    fields?: unknown;
    send?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const b64 = String(body.documentPdfBase64 ?? "").trim();
  if (!title || !b64) {
    return NextResponse.json(
      { error: "title and documentPdfBase64 are required" },
      { status: 400 },
    );
  }

  let buf: Buffer;
  try {
    buf = Buffer.from(b64, "base64");
  } catch {
    return NextResponse.json({ error: "documentPdfBase64 must be valid base64" }, { status: 400 });
  }
  if (buf.length === 0) {
    return NextResponse.json({ error: "PDF payload is empty" }, { status: 400 });
  }
  const max = 16 * 1024 * 1024;
  if (buf.length > max) {
    return NextResponse.json({ error: "PDF must be 16 MB or smaller" }, { status: 400 });
  }
  if (!buf.subarray(0, 4).equals(Buffer.from("%PDF"))) {
    return NextResponse.json({ error: "Payload does not look like a PDF" }, { status: 400 });
  }

  const signers = parseV1Signers(body.signers);
  if (!signers) {
    return NextResponse.json(
      { error: "signers must be a non-empty array of { email, name, routingOrder? }" },
      { status: 400 },
    );
  }

  const parsedFields = parseV1Fields(body.fields, signers);
  const fields = parsedFields ?? defaultFields(signers);

  const send = body.send !== false;

  const id = nanoid();
  const draft: Envelope = {
    id,
    title,
    status: "draft",
    signers,
    fields,
    createdAt: new Date().toISOString(),
    ownerUserId,
  };

  try {
    await insertEnvelope(draft, buf);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!send) {
    return NextResponse.json({
      envelopeId: id,
      status: "draft",
      envelope: sanitizeEnvelopeForClient(draft),
    });
  }

  try {
    const sent = await executeSendEnvelope(id, req);
    return NextResponse.json({
      envelopeId: sent.updated.id,
      status: sent.updated.status,
      envelope: sanitizeEnvelopeForClient(sent.updated),
      inviteLinks: sent.inviteLinks,
      gmailConfigured: sent.gmailConfigured,
      emailsAttempted: sent.emailsAttempted,
      emailResults: sent.emailResults,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Send failed";
    return NextResponse.json({ error: message, envelopeId: id }, { status: 500 });
  }
}
