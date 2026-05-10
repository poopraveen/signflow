import { NextResponse } from "next/server";
import {
  DocuSignConsentRequiredError,
  sendEnvelopeViaDocuSign,
  type DocuSignBridgeSigner,
  type DocuSignSignHereTab,
} from "@/lib/docusign/client";

export const runtime = "nodejs";

const DEFAULT_SIGN_HERE: DocuSignSignHereTab = {
  pageNumber: 1,
  xPosition: 120,
  yPosition: 650,
};

type Body = {
  emailSubject?: string;
  /** @deprecated Prefer `signers` for routing order and tab positions. */
  signerEmail?: string;
  signerName?: string;
  documentPdfBase64?: string;
  documentName?: string;
  status?: "sent" | "created";
  externalReference?: string;
  /** Multi-signer: email, name, routingOrder, signHere / signHereTabs. */
  signers?: unknown;
};

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseSignHereTab(raw: unknown, ctx: string): DocuSignSignHereTab | null {
  if (!isRecord(raw)) return null;
  const pageNumber = raw.pageNumber;
  const xPosition = raw.xPosition;
  const yPosition = raw.yPosition;
  if (
    (typeof pageNumber !== "string" && typeof pageNumber !== "number") ||
    (typeof xPosition !== "string" && typeof xPosition !== "number") ||
    (typeof yPosition !== "string" && typeof yPosition !== "number")
  ) {
    return null;
  }
  const documentId = raw.documentId;
  const tab: DocuSignSignHereTab = { pageNumber, xPosition, yPosition };
  if (documentId !== undefined) {
    if (typeof documentId !== "string" && typeof documentId !== "number") return null;
    tab.documentId = String(documentId);
  }
  return tab;
}

function parseBridgeSignersFromBody(signersRaw: unknown): {
  ok: true;
  signers: DocuSignBridgeSigner[];
} | { ok: false; error: string } {
  if (!Array.isArray(signersRaw) || signersRaw.length === 0) {
    return { ok: false, error: "signers must be a non-empty array" };
  }
  const out: DocuSignBridgeSigner[] = [];
  for (let i = 0; i < signersRaw.length; i++) {
    const row = signersRaw[i];
    const ctx = `signers[${i}]`;
    if (!isRecord(row)) {
      return { ok: false, error: `${ctx} must be an object` };
    }
    const email = String(row.email ?? "").trim().toLowerCase();
    const name = String(row.name ?? "").trim();
    const ro = row.routingOrder;
    if (!email || !email.includes("@")) {
      return { ok: false, error: `${ctx}.email is required` };
    }
    if (!name) {
      return { ok: false, error: `${ctx}.name is required` };
    }
    if (typeof ro !== "number" || !Number.isInteger(ro) || ro < 1) {
      return {
        ok: false,
        error: `${ctx}.routingOrder must be a positive integer`,
      };
    }

    let signHere: DocuSignSignHereTab | undefined;
    let signHereTabs: DocuSignSignHereTab[] | undefined;

    if (row.signHereTabs !== undefined) {
      if (!Array.isArray(row.signHereTabs) || row.signHereTabs.length === 0) {
        return {
          ok: false,
          error: `${ctx}.signHereTabs must be a non-empty array`,
        };
      }
      const tabs: DocuSignSignHereTab[] = [];
      for (let t = 0; t < row.signHereTabs.length; t++) {
        const tab = parseSignHereTab(row.signHereTabs[t], `${ctx}.signHereTabs[${t}]`);
        if (!tab) {
          return {
            ok: false,
            error: `${ctx}.signHereTabs[${t}] needs pageNumber, xPosition, yPosition`,
          };
        }
        tabs.push(tab);
      }
      signHereTabs = tabs;
    } else if (row.signHere !== undefined) {
      const tab = parseSignHereTab(row.signHere, `${ctx}.signHere`);
      if (!tab) {
        return {
          ok: false,
          error: `${ctx}.signHere needs pageNumber, xPosition, yPosition`,
        };
      }
      signHere = tab;
    } else {
      return {
        ok: false,
        error: `${ctx} requires signHere or signHereTabs`,
      };
    }

    out.push({
      email,
      name,
      routingOrder: ro,
      ...(signHereTabs ? { signHereTabs } : { signHere: signHere! }),
    });
  }
  return { ok: true, signers: out };
}

export async function POST(req: Request) {
  const expected = process.env.INTEGRATION_API_KEY?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: "INTEGRATION_API_KEY is not set on the server" },
      { status: 503 },
    );
  }

  const key = req.headers.get("x-integration-api-key")?.trim();
  if (key !== expected) {
    return unauthorized();
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const emailSubject = body.emailSubject?.trim();
  const documentPdfBase64 = body.documentPdfBase64?.trim();

  if (!emailSubject || !documentPdfBase64) {
    return NextResponse.json(
      {
        error: "emailSubject and documentPdfBase64 are required",
      },
      { status: 400 },
    );
  }

  let signers: DocuSignBridgeSigner[];

  if (body.signers !== undefined) {
    const parsed = parseBridgeSignersFromBody(body.signers);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    signers = parsed.signers;
  } else {
    const signerEmail = body.signerEmail?.trim().toLowerCase();
    const signerName = body.signerName?.trim();
    if (!signerEmail || !signerName) {
      return NextResponse.json(
        {
          error:
            "Provide signers[] with routingOrder and signHere, or legacy signerEmail and signerName",
        },
        { status: 400 },
      );
    }
    signers = [
      {
        email: signerEmail,
        name: signerName,
        routingOrder: 1,
        signHere: DEFAULT_SIGN_HERE,
      },
    ];
  }

  try {
    const result = await sendEnvelopeViaDocuSign({
      emailSubject,
      documentBase64: documentPdfBase64,
      documentName: body.documentName,
      status: body.status,
      externalReference: body.externalReference,
      signers,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    if (e instanceof DocuSignConsentRequiredError) {
      return NextResponse.json(
        { error: e.message, consentUrl: e.consentUrl },
        { status: 403 },
      );
    }
    const message = e instanceof Error ? e.message : "DocuSign error";
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
