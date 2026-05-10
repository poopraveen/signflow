import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { userMayManageEnvelope } from "@/lib/envelope-access";
import { sanitizeEnvelopeForClient } from "@/lib/envelope-utils";
import { executeSendEnvelope } from "@/lib/envelope-send";
import { findEnvelopeById } from "@/lib/envelope-repository";
import { getMongoClient } from "@/lib/mongodb";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await getMongoClient();
    const { id } = await ctx.params;
    const envelope = await findEnvelopeById(id);
    if (!envelope) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!userMayManageEnvelope(envelope, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sent = await executeSendEnvelope(id, req);
    return NextResponse.json({
      ok: true,
      inviteLinks: sent.inviteLinks,
      gmailConfigured: sent.gmailConfigured,
      emailsAttempted: sent.emailsAttempted,
      emailResults: sent.emailResults,
      envelope: sanitizeEnvelopeForClient(sent.updated),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message === "Not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (message.includes("signature field")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
