import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Envelope } from "@/lib/types";

function parseDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl.trim());
  if (!m) return null;
  return { mime: m[1].toLowerCase(), base64: m[2].replace(/\s/g, "") };
}

/**
 * Merge field values (signature images, text) into a copy of the original PDF.
 * Field geometry matches the prepare/sign overlay: x,y,width,height are 0–1 relative to page; y from top.
 */
export async function renderSignedPdfBytes(
  originalPdf: Uint8Array,
  envelope: Envelope,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(originalPdf);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (const field of envelope.fields) {
    const val = field.value?.trim();
    if (!val) continue;

    const pages = doc.getPages();
    const page = pages[field.pageIndex];
    if (!page) continue;

    const { width: pw, height: ph } = page.getSize();
    const xLl = field.x * pw;
    const yLl = ph * (1 - field.y - field.height);
    const wPt = field.width * pw;
    const hPt = field.height * ph;

    if (field.type === "signature" && val.startsWith("data:")) {
      const parsed = parseDataUrl(val);
      if (!parsed) continue;
      const bytes = Buffer.from(parsed.base64, "base64");
      const u8 = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      try {
        let image;
        if (parsed.mime.includes("png")) {
          image = await doc.embedPng(u8);
        } else if (parsed.mime.includes("jpeg") || parsed.mime.includes("jpg")) {
          image = await doc.embedJpg(u8);
        } else {
          image = await doc.embedPng(u8);
        }
        page.drawImage(image, { x: xLl, y: yLl, width: wPt, height: hPt });
      } catch {
        /* skip corrupt image */
      }
    } else {
      const text = val.length > 2000 ? `${val.slice(0, 2000)}…` : val;
      const fontSize = Math.max(7, Math.min(14, hPt * 0.55));
      const baselineY = yLl + (hPt - fontSize) / 2 + fontSize * 0.25;
      page.drawText(text, {
        x: xLl + 2,
        y: baselineY,
        size: fontSize,
        font,
        color: rgb(0.12, 0.15, 0.22),
        maxWidth: Math.max(8, wPt - 4),
        lineHeight: fontSize * 1.15,
      });
    }
  }

  return doc.save();
}

export function signedPdfFilename(title: string): string {
  const base = title
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, "-")
    .replace(/[^\x20-\x7E]+/g, "")
    .slice(0, 80);
  return `signed-${base || "document"}.pdf`;
}
