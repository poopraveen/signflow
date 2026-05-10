import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { openPdfDownloadStream } from "@/lib/envelope-repository";
import { getMongoClient } from "@/lib/mongodb";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    await getMongoClient();
    const { id } = await ctx.params;
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
