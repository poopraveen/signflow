import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canDownloadEnvelopePdf } from "@/lib/envelope-access";
import { findEnvelopeById, openPdfDownloadStream } from "@/lib/envelope-repository";
import { getMongoClient } from "@/lib/mongodb";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    await getMongoClient();
    const { id } = await ctx.params;
    const envelope = await findEnvelopeById(id);
    if (!envelope) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const session = await auth();
    const token = new URL(req.url).searchParams.get("token")?.trim() ?? null;

    if (!canDownloadEnvelopePdf(envelope, session?.user?.id, token)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const download = await openPdfDownloadStream(id);
    if (!download) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }
    const web = Readable.toWeb(download as Readable) as ReadableStream<Uint8Array>;
    return new NextResponse(web, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
