import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { insertEnvelope, listEnvelopes } from "@/lib/envelope-repository";
import { sanitizeEnvelopeForClient } from "@/lib/envelope-utils";
import { getMongoClient } from "@/lib/mongodb";
import type { Envelope, Signer } from "@/lib/types";

export async function GET() {
  try {
    const items = await listEnvelopes();
    return NextResponse.json(items.map(sanitizeEnvelopeForClient));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

function parseSignersFromForm(form: FormData): Signer[] | null {
  const raw = String(form.get("signersJson") ?? "").trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed) || parsed.length === 0) return null;
      const signers: Signer[] = [];
      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i] as Record<string, unknown>;
        const name = String(row?.name ?? "").trim();
        const email = String(row?.email ?? "").trim().toLowerCase();
        if (!name || !email) return null;
        signers.push({ id: nanoid(), name, email, order: i });
      }
      return signers;
    } catch {
      return null;
    }
  }
  const signerName = String(form.get("signerName") ?? "").trim();
  const signerEmail = String(form.get("signerEmail") ?? "").trim().toLowerCase();
  if (!signerName || !signerEmail) return null;
  return [{ id: nanoid(), name: signerName, email: signerEmail, order: 0 }];
}

export async function POST(req: Request) {
  try {
    await getMongoClient();
    const form = await req.formData();
    const title = String(form.get("title") ?? "").trim();
    const file = form.get("file");

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const signers = parseSignersFromForm(form);
    if (!signers) {
      return NextResponse.json(
        { error: "At least one signer with name and email is required" },
        { status: 400 },
      );
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }
    const max = 16 * 1024 * 1024;
    if (file.size > max) {
      return NextResponse.json({ error: "PDF must be 16 MB or smaller" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const id = nanoid();

    const envelope: Envelope = {
      id,
      title,
      status: "draft",
      signers,
      fields: [],
      createdAt: new Date().toISOString(),
    };

    await insertEnvelope(envelope, buf);
    return NextResponse.json(sanitizeEnvelopeForClient(envelope));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
