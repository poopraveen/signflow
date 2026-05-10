import type { Envelope, Signer } from "@/lib/types";

/** Remove signing secrets before sending envelope JSON to the browser. */
export function sanitizeEnvelopeForClient(envelope: Envelope): Envelope {
  return {
    ...envelope,
    signers: envelope.signers.map((s) => {
      const { signToken: _t, ...rest } = s;
      return rest as Signer;
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
    signers: mergeSignersPreserveTokens(existing.signers, incoming.signers),
  };
}
