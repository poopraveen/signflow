import { buffer } from "node:stream/consumers";
import type { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canDownloadSignedPdf } from "@/lib/envelope-access";
import { findEnvelopeById, openPdfDownloadStream } from "@/lib/envelope-repository";
import { getMongoClient } from "@/lib/mongodb";
import { renderSignedPdfBytes, signedPdfFilename } from "@/lib/render-signed-pdf";

export const runtime = "nodejs";

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

    if (!canDownloadSignedPdf(envelope, session?.user?.id, token)) {
      if (envelope.status !== "completed") {
        return NextResponse.json(
          { error: "Signed PDF is only available when the envelope is completed" },
          { status: 409 },
        );
      }
      const allFilled = envelope.fields.every(
        (f) => f.value && String(f.value).trim().length > 0,
      );
      if (!allFilled) {
        return NextResponse.json(
          { error: "All fields must be completed before downloading" },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const download = await openPdfDownloadStream(id);
    if (!download) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    const original = await buffer(download as Readable);
    const out = await renderSignedPdfBytes(new Uint8Array(original), envelope);
    const filename = signedPdfFilename(envelope.title);

    return new NextResponse(Buffer.from(out), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
