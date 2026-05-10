import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createApiKey, deleteApiKey, listApiKeysForUser } from "@/lib/api-key-repository";
import { getMongoClient } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await getMongoClient();
    const keys = await listApiKeysForUser(session.user.id);
    return NextResponse.json({ keys });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { label?: string };
  try {
    body = (await req.json()) as { label?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    await getMongoClient();
    const { id, rawKey, keyPreview } = await createApiKey(
      session.user.id,
      String(body.label ?? "").trim() || "API key",
    );
    return NextResponse.json({
      id,
      /** Full secret — shown only this once; store in your integration or password manager. */
      key: rawKey,
      keyPreview,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    const status =
      message.includes("MONGODB_URI") || message.includes("AUTH_SECRET") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "Query id is required" }, { status: 400 });
  }
  try {
    await getMongoClient();
    const ok = await deleteApiKey(session.user.id, id);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
