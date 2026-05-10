import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMongoClient } from "@/lib/mongodb";
import {
  getTenantEmailBranding,
  saveTenantEmailBranding,
} from "@/lib/tenant-branding-repository";
import type { TenantEmailBranding } from "@/lib/types";

export const runtime = "nodejs";

const HEX = /^#[0-9A-Fa-f]{6}$/;

function isHttpsUrl(s: string): boolean {
  return /^https:\/\/.+/i.test(s) && s.length < 2048;
}

function validatePayload(
  body: Record<string, unknown>,
): Omit<TenantEmailBranding, "ownerUserId" | "updatedAt"> {
  const out: Omit<TenantEmailBranding, "ownerUserId" | "updatedAt"> = {};

  if (typeof body.companyName === "string") {
    out.companyName = body.companyName.trim().slice(0, 120) || undefined;
  }
  if (typeof body.logoUrl === "string") {
    const u = body.logoUrl.trim().slice(0, 2048);
    if (u && !isHttpsUrl(u)) {
      throw new Error("Logo URL must be a valid https:// link");
    }
    out.logoUrl = u || undefined;
  }
  if (body.primaryColor !== undefined) {
    const c = String(body.primaryColor ?? "").trim();
    if (c && !HEX.test(c)) throw new Error("primaryColor must be #RRGGBB");
    out.primaryColor = c || undefined;
  }
  if (body.accentColor !== undefined) {
    const c = String(body.accentColor ?? "").trim();
    if (c && !HEX.test(c)) throw new Error("accentColor must be #RRGGBB");
    out.accentColor = c || undefined;
  }
  if (typeof body.introText === "string") {
    out.introText = body.introText.trim().slice(0, 2000) || undefined;
  }
  if (typeof body.footerNote === "string") {
    out.footerNote = body.footerNote.trim().slice(0, 2000) || undefined;
  }
  out.useCustomHtml = body.useCustomHtml === true;
  if (typeof body.customHtml === "string") {
    out.customHtml = body.customHtml.slice(0, 48_000) || undefined;
  }
  if (out.useCustomHtml && !out.customHtml?.trim()) {
    throw new Error("Custom HTML is required when using a custom template");
  }

  return out;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await getMongoClient();
    const branding = await getTenantEmailBranding(session.user.id);
    return NextResponse.json({ branding });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    await getMongoClient();
    const patch = validatePayload(body);
    const branding = await saveTenantEmailBranding(session.user.id, patch);
    return NextResponse.json({ branding });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    if (
      message.includes("Logo URL") ||
      message.includes("primaryColor") ||
      message.includes("accentColor") ||
      message.includes("Custom HTML")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
