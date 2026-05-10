import { NextResponse } from "next/server";
import { findEnvelopeById } from "@/lib/envelope-repository";
import { sanitizeEnvelopeForClient } from "@/lib/envelope-utils";
import { getMongoClient } from "@/lib/mongodb";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Returns envelope + signerId for an active signing session.
 * - With `?token=` matching a signer's signToken (required when multiple signers).
 * - Without token: only allowed when there is exactly one signer (legacy).
 */
export async function GET(req: Request, ctx: Ctx) {
  try {
    await getMongoClient();
    const { id } = await ctx.params;
    const token = new URL(req.url).searchParams.get("token")?.trim();

    const envelope = await findEnvelopeById(id);
    if (!envelope) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (envelope.status === "draft") {
      return NextResponse.json({ error: "Envelope is not ready for signing" }, { status: 403 });
    }

    let signerId: string | null = null;

    if (token) {
      const signer = envelope.signers.find((s) => s.signToken === token);
      if (!signer) {
        return NextResponse.json({ error: "Invalid or expired signing link" }, { status: 404 });
      }
      signerId = signer.id;
    } else if (envelope.signers.length === 1) {
      signerId = envelope.signers[0].id;
    } else if (envelope.status === "completed") {
      // Read-only review: any party can open /sign/[id] without token once finished.
      signerId = envelope.signers[0].id;
    } else {
      return NextResponse.json(
        {
          error: "token_required",
          message: "Use the personal link from your email to sign this document.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      envelope: sanitizeEnvelopeForClient(envelope),
      signerId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
