import { NextResponse } from "next/server";
import { normalizePrivateKey } from "@/lib/docusign/config";

export const runtime = "nodejs";

/** Returns which DocuSign-related env vars are present (no secrets). */
export async function GET() {
  const hasIk = Boolean(process.env.DOCUSIGN_INTEGRATION_KEY?.trim());
  const hasUser = Boolean(process.env.DOCUSIGN_USER_ID?.trim());
  const hasKey = Boolean(normalizePrivateKey(process.env.DOCUSIGN_RSA_PRIVATE_KEY));
  const hasIntegration = Boolean(process.env.INTEGRATION_API_KEY?.trim());
  const oauth = process.env.DOCUSIGN_OAUTH_BASE_PATH?.trim() || "account-d.docusign.com (default)";
  const ready = hasIk && hasUser && hasKey && hasIntegration;

  return NextResponse.json({
    docusignJwtReady: hasIk && hasUser && hasKey,
    thirdPartyBridgeReady: ready,
    oauthBasePath: oauth,
    hasAccountIdOverride: Boolean(process.env.DOCUSIGN_ACCOUNT_ID?.trim()),
  });
}
