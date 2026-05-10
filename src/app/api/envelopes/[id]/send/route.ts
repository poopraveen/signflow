import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { findEnvelopeById, replaceEnvelope } from "@/lib/envelope-repository";
import { sanitizeEnvelopeForClient } from "@/lib/envelope-utils";
import { sendGmailEmail } from "@/lib/gmail";
import { getMongoClient } from "@/lib/mongodb";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function publicOrigin(req: Request): string {
  const env = process.env.APP_ORIGIN?.trim();
  if (env) return env.replace(/\/$/, "");
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    await getMongoClient();
    const { id } = await ctx.params;
    const envelope = await findEnvelopeById(id);
    if (!envelope) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (envelope.fields.length === 0) {
      return NextResponse.json(
        { error: "Add at least one signature field before sending" },
        { status: 400 },
      );
    }

    const signers = envelope.signers.map((s) => ({
      ...s,
      signToken: s.signToken || nanoid(32),
    }));

    const updated = { ...envelope, status: "sent" as const, signers };
    await replaceEnvelope(updated);

    const origin = publicOrigin(req);
    const inviteLinks = signers.map((s) => ({
      email: s.email,
      name: s.name,
      url: `${origin}/sign/${id}?token=${encodeURIComponent(s.signToken!)}`,
    }));

    const gmailConfigured = Boolean(
      process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim(),
    );

    const emailResults: { email: string; ok: boolean; error?: string }[] = [];

    if (gmailConfigured) {
      for (const link of inviteLinks) {
        try {
          await sendGmailEmail({
            to: link.email,
            subject: `Signature requested: ${envelope.title}`,
            text: `Hi ${link.name},\n\nPlease review and sign "${envelope.title}".\n\nYour personal signing link:\n${link.url}\n\nIf you did not expect this message, you can ignore it.`,
          });
          emailResults.push({ email: link.email, ok: true });
        } catch (e) {
          emailResults.push({
            email: link.email,
            ok: false,
            error: e instanceof Error ? e.message : "send failed",
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      inviteLinks,
      gmailConfigured,
      emailsAttempted: gmailConfigured,
      emailResults: gmailConfigured ? emailResults : undefined,
      envelope: sanitizeEnvelopeForClient(updated),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
