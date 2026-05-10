import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * DocuSign Connect (outbound webhook) receiver.
 * In DocuSign Admin → Connect, point your configuration to:
 *   POST https://<your-host>/api/webhooks/docusign-connect
 * Enable HMAC and set DOCUSIGN_CONNECT_HMAC_SECRET to the same secret.
 */
function verifyHmac(rawBody: string, signatureB64: string | null, secret: string): boolean {
  if (!signatureB64) return false;
  const hmac = createHmac("sha256", secret);
  hmac.update(rawBody, "utf8");
  const expected = Buffer.from(hmac.digest("base64"), "utf8");
  const received = Buffer.from(signatureB64, "utf8");
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

export async function POST(req: Request) {
  const secret = process.env.DOCUSIGN_CONNECT_HMAC_SECRET?.trim();
  const raw = await req.text();

  if (secret) {
    const sig =
      req.headers.get("x-docusign-signature-1") ??
      req.headers.get("X-DocuSign-Signature-1");
    if (!verifyHmac(raw, sig, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: unknown = raw;
  try {
    payload = JSON.parse(raw) as unknown;
  } catch {
    /* Connect may send XML depending on configuration */
  }

  // Hook: persist to DB, notify queues, etc.
  if (process.env.NODE_ENV === "development") {
    console.info("[DocuSign Connect]", JSON.stringify(payload).slice(0, 2000));
  }

  return NextResponse.json({ ok: true });
}
