import type { Envelope } from "@/lib/types";

/** Browser/API session user may edit this envelope (legacy: no owner = any signed-in user). */
export function userMayManageEnvelope(envelope: Envelope, userId: string): boolean {
  if (!envelope.ownerUserId) return true;
  return envelope.ownerUserId === userId;
}

export function canDownloadEnvelopePdf(
  envelope: Envelope,
  sessionUserId: string | undefined,
  signToken: string | null,
): boolean {
  if (envelope.status === "completed") {
    return true;
  }
  if (!envelope.ownerUserId && envelope.status === "draft") {
    return true;
  }
  if (sessionUserId && userMayManageEnvelope(envelope, sessionUserId)) {
    return true;
  }
  if (signToken && envelope.signers.some((s) => s.signToken === signToken)) {
    return true;
  }
  /* Legacy single-signer links may omit ?token=; align with sign-session behavior. */
  if (envelope.status === "sent" && envelope.signers.length === 1) {
    return true;
  }
  return false;
}

/** Completed envelope with all field values; same access rules as original PDF download. */
export function canDownloadSignedPdf(
  envelope: Envelope,
  sessionUserId: string | undefined,
  signToken: string | null,
): boolean {
  if (envelope.status !== "completed") return false;
  if (!envelope.fields.length) return false;
  const allFilled = envelope.fields.every((f) => f.value && String(f.value).trim().length > 0);
  if (!allFilled) return false;
  return canDownloadEnvelopePdf(envelope, sessionUserId, signToken);
}
