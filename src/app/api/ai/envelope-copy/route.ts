import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { enhanceEnvelopeCopy } from "@/lib/openai-envelope-copy";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { subject?: string; description?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const subject = String(body.subject ?? "").trim();
    if (!subject) {
      return NextResponse.json({ error: "subject is required" }, { status: 400 });
    }

    const rawDescription =
      typeof body.description === "string" ? body.description : undefined;

    const out = await enhanceEnvelopeCopy({ subject, rawDescription });
    return NextResponse.json(out);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message.includes("OPENAI_API_KEY")) {
      return NextResponse.json(
        { error: "AI copy is not configured (set OPENAI_API_KEY on the server)." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
