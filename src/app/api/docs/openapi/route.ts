import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Public OpenAPI 3 spec for the native v1 API (no secrets). */
export async function GET() {
  const file = path.join(process.cwd(), "openapi", "signflow-v1.openapi.yaml");
  const text = await readFile(file, "utf8");
  return new NextResponse(text, {
    headers: {
      "Content-Type": "application/yaml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
