/** Server-only DocuSign configuration. */

export type DocuSignEnv = {
  integrationKey: string;
  userId: string;
  rsaPrivateKeyPem: string;
  oauthBasePath: string;
  /** If set, skips resolving default account from /oauth/userinfo */
  accountId?: string;
};

export function normalizePrivateKey(raw: string | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (trimmed.includes("BEGIN")) {
    return trimmed.replace(/\\n/g, "\n");
  }
  try {
    return Buffer.from(trimmed, "base64").toString("utf8");
  } catch {
    return trimmed.replace(/\\n/g, "\n");
  }
}

export function getDocuSignEnv(): DocuSignEnv {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY?.trim();
  const userId = process.env.DOCUSIGN_USER_ID?.trim();
  const rsaPrivateKeyPem = normalizePrivateKey(process.env.DOCUSIGN_RSA_PRIVATE_KEY);
  const oauthBasePath =
    process.env.DOCUSIGN_OAUTH_BASE_PATH?.trim() || "account-d.docusign.com";
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID?.trim();

  if (!integrationKey || !userId || !rsaPrivateKeyPem) {
    throw new Error(
      "DocuSign is not configured. Set DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, and DOCUSIGN_RSA_PRIVATE_KEY.",
    );
  }

  return { integrationKey, userId, rsaPrivateKeyPem, oauthBasePath, accountId };
}

export function docuSignConsentUrl(integrationKey: string, oauthBasePath: string): string {
  const host = oauthBasePath.replace(/^https?:\/\//, "");
  const scope = encodeURIComponent("signature impersonation");
  return `https://${host}/oauth/auth?response_type=code&scope=${scope}&client_id=${encodeURIComponent(integrationKey)}&redirect_uri=${encodeURIComponent("https://developers.docusign.com/platform/auth/consent")}`;
}
