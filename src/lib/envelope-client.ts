"use client";

import type { Envelope } from "@/lib/types";

/** Stable empty snapshot — `useSyncExternalStore` requires getSnapshot to return the same ref when data is unchanged. */
const EMPTY_ENVELOPES: Envelope[] = [];

let cache: Envelope[] | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((l) => l());
}

export function subscribeEnvelopes(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getEnvelopesSnapshot(): Envelope[] {
  return cache ?? EMPTY_ENVELOPES;
}

/** Use as the third argument to `useSyncExternalStore` on the server. */
export function getEnvelopesServerSnapshot(): Envelope[] {
  return EMPTY_ENVELOPES;
}

export async function refreshEnvelopes(): Promise<Envelope[]> {
  const res = await fetch("/api/envelopes");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err?.error === "string" ? err.error : "Failed to load envelopes");
  }
  cache = (await res.json()) as Envelope[];
  notify();
  return cache;
}

export async function fetchEnvelope(id: string): Promise<Envelope | null> {
  const res = await fetch(`/api/envelopes/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err?.error === "string" ? err.error : "Failed to load envelope");
  }
  return (await res.json()) as Envelope;
}

export type InviteLink = { email: string; name: string; url: string };

export type SendEnvelopeResult = {
  ok: boolean;
  inviteLinks: InviteLink[];
  gmailConfigured: boolean;
  emailsAttempted?: boolean;
  emailResults?: { email: string; ok: boolean; error?: string }[];
  envelope: Envelope;
};

export async function sendEnvelopeNow(id: string): Promise<SendEnvelopeResult> {
  const res = await fetch(`/api/envelopes/${id}/send`, { method: "POST" });
  const data = (await res.json().catch(() => ({}))) as SendEnvelopeResult & { error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Failed to send envelope");
  }
  await refreshEnvelopes();
  return data;
}

export async function fetchSignSession(
  id: string,
  token: string | null,
): Promise<{ envelope: Envelope; signerId: string }> {
  const q = token ? `?token=${encodeURIComponent(token)}` : "";
  const res = await fetch(`/api/envelopes/${id}/sign-session${q}`);
  const data = (await res.json().catch(() => ({}))) as {
    envelope?: Envelope;
    signerId?: string;
    error?: string;
    message?: string;
  };
  if (res.status === 400 && data.error === "token_required") {
    throw new Error(
      data.message ??
        "This envelope has multiple signers. Open the link from your email (it contains a private token).",
    );
  }
  if (!res.ok || !data.envelope || !data.signerId) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Could not start signing session",
    );
  }
  return { envelope: data.envelope, signerId: data.signerId };
}

export async function createEnvelope(form: FormData): Promise<Envelope> {
  const res = await fetch("/api/envelopes", { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err?.error === "string" ? err.error : "Failed to create envelope");
  }
  const env = (await res.json()) as Envelope;
  await refreshEnvelopes();
  return env;
}

export async function saveEnvelopeToServer(envelope: Envelope): Promise<void> {
  const res = await fetch(`/api/envelopes/${envelope.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(envelope),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err?.error === "string" ? err.error : "Failed to save envelope");
  }
  await refreshEnvelopes();
}

export function envelopePdfUrl(id: string, signToken?: string | null): string {
  const base = `/api/envelopes/${id}/pdf`;
  if (signToken) {
    return `${base}?token=${encodeURIComponent(signToken)}`;
  }
  return base;
}
