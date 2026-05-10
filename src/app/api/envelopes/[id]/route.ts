import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { userMayManageEnvelope } from "@/lib/envelope-access";
import { findEnvelopeById, replaceEnvelope } from "@/lib/envelope-repository";
import { applyEnvelopePatch, sanitizeEnvelopeForClient } from "@/lib/envelope-utils";
import { getMongoClient } from "@/lib/mongodb";
import type { Envelope } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
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
    return NextResponse.json(sanitizeEnvelopeForClient(envelope));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await getMongoClient();
    const { id } = await ctx.params;
    const body = (await req.json()) as Envelope;
    if (!body?.id || body.id !== id) {
      return NextResponse.json({ error: "Body id must match URL" }, { status: 400 });
    }
    const existing = await findEnvelopeById(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!userMayManageEnvelope(existing, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const merged = applyEnvelopePatch(existing, body);
    await replaceEnvelope(merged);
    return NextResponse.json(sanitizeEnvelopeForClient(merged));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
