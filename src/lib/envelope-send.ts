import { nanoid } from "nanoid";
import {
  buildSignInviteHtml,
  buildSignInvitePlainText,
} from "@/lib/email-templates/sign-invite-html";
import { findEnvelopeById, replaceEnvelope } from "@/lib/envelope-repository";
import { sendGmailEmail } from "@/lib/gmail";
import { getTenantEmailBranding } from "@/lib/tenant-branding-repository";
import type { Envelope } from "@/lib/types";

export function publicOriginFromRequest(req: Request): string {
  const env = process.env.APP_ORIGIN?.trim();
  if (env) return env.replace(/\/$/, "");
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

export async function executeSendEnvelope(
  envelopeId: string,
  req: Request,
): Promise<{
  inviteLinks: { email: string; name: string; url: string }[];
  gmailConfigured: boolean;
  emailsAttempted: boolean;
  emailResults?: { email: string; ok: boolean; error?: string }[];
  updated: Envelope;
}> {
  const envelope = await findEnvelopeById(envelopeId);
  if (!envelope) {
    throw new Error("Not found");
  }
  if (envelope.fields.length === 0) {
    throw new Error("Add at least one signature field before sending");
  }

  const signers = envelope.signers.map((s) => ({
    ...s,
    signToken: s.signToken || nanoid(32),
  }));
  const updated = { ...envelope, status: "sent" as const, signers };
  await replaceEnvelope(updated);

  const origin = publicOriginFromRequest(req);
  const inviteLinks = signers.map((s) => ({
    email: s.email,
    name: s.name,
    url: `${origin}/sign/${envelopeId}?token=${encodeURIComponent(s.signToken!)}`,
  }));

  const gmailConfigured = Boolean(
    process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim(),
  );
  const emailResults: { email: string; ok: boolean; error?: string }[] = [];

  const branding =
    updated.ownerUserId != null && updated.ownerUserId.length > 0
      ? await getTenantEmailBranding(updated.ownerUserId)
      : null;

  if (gmailConfigured) {
    for (const link of inviteLinks) {
      try {
        const inviteParams = {
          signerName: link.name,
          envelopeTitle: envelope.title,
          signUrl: link.url,
          appOrigin: origin,
        };
        await sendGmailEmail({
          to: link.email,
          subject: `Signature requested: ${envelope.title}`,
          text: buildSignInvitePlainText(inviteParams, branding),
          html: buildSignInviteHtml(inviteParams, branding),
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

  return {
    inviteLinks,
    gmailConfigured,
    emailsAttempted: gmailConfigured,
    emailResults: gmailConfigured ? emailResults : undefined,
    updated,
  };
}
