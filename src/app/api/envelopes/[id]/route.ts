import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { userMayManageEnvelope } from "@/lib/envelope-access";
import { findEnvelopeById, replaceEnvelope } from "@/lib/envelope-repository";
import {
  applyEnvelopePatch,
  applySignerFieldPatch,
  sanitizeEnvelopeForClient,
} from "@/lib/envelope-utils";
import { getMongoClient } from "@/lib/mongodb";
import type { Envelope } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin");
  const allow =
    origin && origin !== "null" ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-sign-token",
    "Vary": "Origin",
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: Request, ctx: Ctx) {
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
    return NextResponse.json(sanitizeEnvelopeForClient(envelope), {
      headers: corsHeaders(req),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

function extractSignToken(req: Request): string | null {
  const url = new URL(req.url);
  const q = url.searchParams.get("token")?.trim();
  if (q) return q;
  return req.headers.get("x-sign-token")?.trim() ?? null;
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
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

    const session = await auth();
    const signToken = extractSignToken(req);

    let merged: Envelope;

    if (session?.user?.id) {
      if (!userMayManageEnvelope(existing, session.user.id)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      merged = applyEnvelopePatch(existing, body);
    } else if (signToken) {
      const signer = existing.signers.find((s) => s.signToken === signToken);
      if (!signer) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (existing.status === "completed") {
        return NextResponse.json(
          { error: "Envelope is already completed" },
          { status: 409 },
        );
      }
      if (existing.status !== "sent") {
        return NextResponse.json(
          { error: "Signing is only allowed on sent envelopes" },
          { status: 409 },
        );
      }
      merged = applySignerFieldPatch(existing, body, signer.id);
    } else if (
      existing.signers.length === 1 &&
      existing.status === "sent" &&
      !session?.user?.id
    ) {
      /* Legacy: /sign/[id] without ?token= when there is only one signer */
      merged = applySignerFieldPatch(existing, body, existing.signers[0].id);
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await replaceEnvelope(merged);
    return NextResponse.json(sanitizeEnvelopeForClient(merged), {
      headers: corsHeaders(req),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
