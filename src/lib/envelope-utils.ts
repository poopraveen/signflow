import type { Envelope, Signer } from "@/lib/types";

/** Remove signing secrets and ownership before sending envelope JSON to the browser. */
export function sanitizeEnvelopeForClient(envelope: Envelope): Envelope {
  const { ownerUserId: _o, ...rest } = envelope;
  return {
    ...rest,
    signers: envelope.signers.map((s) => {
      const { signToken: _t, ...srest } = s;
      return srest as Signer;
    }),
  };
}

/** When the client PATCHes an envelope, ignore any `signToken` in the body; keep server-issued tokens only. */
export function mergeSignersPreserveTokens(
  existing: Signer[],
  incoming: Signer[],
): Signer[] {
  return incoming.map((s) => {
    const { signToken: _clientToken, ...clean } = s;
    const prev = existing.find((p) => p.id === s.id);
    if (prev?.signToken) {
      return { ...clean, signToken: prev.signToken };
    }
    return clean as Signer;
  });
}

export function applyEnvelopePatch(existing: Envelope, incoming: Envelope): Envelope {
  return {
    ...incoming,
    ownerUserId: existing.ownerUserId,
    signers: mergeSignersPreserveTokens(existing.signers, incoming.signers),
  };
}

/**
 * Signer (token-auth) may only update `value` on their own fields. Completion is derived on the server.
 */
export function applySignerFieldPatch(
  existing: Envelope,
  incoming: Envelope,
  signerId: string,
): Envelope {
  const fields = existing.fields.map((f) => {
    if (f.signerId !== signerId) return f;
    const inc = incoming.fields.find((x) => x.id === f.id);
    if (!inc || inc.value === undefined || inc.value === null) return f;
    return { ...f, value: String(inc.value) };
  });
  const allDone = fields.every((f) => f.value && String(f.value).trim().length > 0);
  return {
    ...existing,
    fields,
    status: allDone ? "completed" : existing.status,
    completedAt: allDone ? new Date().toISOString() : existing.completedAt,
  };
}
