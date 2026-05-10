/**
 * DocuSign eSignature REST API + JWT (server-only). No `docusign-esign` SDK (Turbopack-incompatible).
 */
import jwt from "jsonwebtoken";
import {
  docuSignConsentUrl,
  getDocuSignEnv,
  type DocuSignEnv,
} from "@/lib/docusign/config";

type OAuthTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type UserInfoAccount = {
  account_id: string;
  base_uri: string;
  is_default?: boolean | string;
};

type UserInfoResponse = {
  accounts?: Array<Record<string, unknown>>;
};

function normalizeAccounts(info: UserInfoResponse): UserInfoAccount[] {
  const raw = info.accounts ?? [];
  return raw.map((o) => ({
    account_id: String(o.account_id ?? o.accountId ?? ""),
    base_uri: String(o.base_uri ?? o.baseUri ?? ""),
    is_default: (o.is_default ?? o.isDefault) as boolean | string | undefined,
  })).filter((a) => a.account_id && a.base_uri);
}

type CachedContext = {
  accessToken: string;
  accountId: string;
  restBase: string;
  expiresAt: number;
};

let cache: CachedContext | null = null;

export class DocuSignConsentRequiredError extends Error {
  consentUrl: string;
  constructor(consentUrl: string) {
    super(
      "DocuSign JWT consent required. Open consentUrl once as the impersonated user, then retry.",
    );
    this.name = "DocuSignConsentRequiredError";
    this.consentUrl = consentUrl;
  }
}

function pickAccount(
  env: DocuSignEnv,
  accounts: UserInfoAccount[],
): { accountId: string; baseUri: string } {
  if (env.accountId) {
    const match = accounts.find((a) => a.account_id === env.accountId);
    if (!match) {
      throw new Error(
        `DOCUSIGN_ACCOUNT_ID ${env.accountId} not found for this user. Check DocuSign admin.`,
      );
    }
    return { accountId: match.account_id, baseUri: match.base_uri };
  }
  const def =
    accounts.find((a) => a.is_default === true || a.is_default === "true") ?? accounts[0];
  if (!def) throw new Error("DocuSign user has no accounts.");
  return { accountId: def.account_id, baseUri: def.base_uri };
}

async function requestJwtAccessToken(env: DocuSignEnv): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    {
      iss: env.integrationKey,
      sub: env.userId,
      aud: env.oauthBasePath,
      iat: now,
      exp: now + 3600,
      scope: "signature impersonation",
    },
    env.rsaPrivateKeyPem,
    { algorithm: "RS256" },
  );

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const res = await fetch(`https://${env.oauthBasePath}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await res.json()) as OAuthTokenResponse;

  if (!res.ok || !data.access_token) {
    const desc = (data.error_description ?? data.error ?? "").toString();
    if (
      data.error === "consent_required" ||
      /consent_required|invalid_grant/i.test(desc)
    ) {
      throw new DocuSignConsentRequiredError(
        docuSignConsentUrl(env.integrationKey, env.oauthBasePath),
      );
    }
    throw new Error(`DocuSign token error: ${data.error ?? res.status} ${desc}`);
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? 3600,
  };
}

async function fetchUserInfo(
  oauthBasePath: string,
  accessToken: string,
): Promise<UserInfoResponse> {
  const res = await fetch(`https://${oauthBasePath}/oauth/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Cache-Control": "no-store",
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`DocuSign userinfo failed: ${res.status} ${t}`);
  }
  return (await res.json()) as UserInfoResponse;
}

export async function getDocuSignContext(): Promise<{
  accessToken: string;
  accountId: string;
  restBase: string;
}> {
  const env = getDocuSignEnv();
  const now = Date.now();
  if (cache && now < cache.expiresAt - 60_000) {
    return {
      accessToken: cache.accessToken,
      accountId: cache.accountId,
      restBase: cache.restBase,
    };
  }

  const { accessToken, expiresIn } = await requestJwtAccessToken(env);
  const userInfo = await fetchUserInfo(env.oauthBasePath, accessToken);
  const accounts = normalizeAccounts(userInfo);
  const { accountId, baseUri } = pickAccount(env, accounts);
  const restBase = `${baseUri.replace(/\/$/, "")}/restapi`;

  cache = {
    accessToken,
    accountId,
    restBase,
    expiresAt: now + Math.max(300, expiresIn - 120) * 1000,
  };

  return { accessToken, accountId, restBase };
}

/** One Sign Here tab; coordinates are PDF page pixels (DocuSign origin top-left of page). */
export type DocuSignSignHereTab = {
  /** Defaults to `"1"` (first PDF in the envelope). */
  documentId?: string;
  pageNumber: number | string;
  xPosition: number | string;
  yPosition: number | string;
};

/** Third-party / bridge API signer row. */
export type DocuSignBridgeSigner = {
  email: string;
  name: string;
  /**
   * Signing sequence: lower numbers sign first. Same value = parallel at that step.
   * Must be a positive integer (e.g. 1, 2, 3).
   */
  routingOrder: number;
  /**
   * At least one signature field. Use a single object or multiple placements.
   * If both are omitted, the API route applies a default tab (legacy only).
   */
  signHere?: DocuSignSignHereTab;
  signHereTabs?: DocuSignSignHereTab[];
};

function tabToApi(
  tab: DocuSignSignHereTab,
  recipientId: string,
): Record<string, string> {
  const documentId = String(tab.documentId ?? "1").trim() || "1";
  return {
    documentId,
    pageNumber: String(tab.pageNumber),
    recipientId,
    xPosition: String(tab.xPosition),
    yPosition: String(tab.yPosition),
  };
}

function normalizeTabsForSigner(
  signer: DocuSignBridgeSigner,
  recipientId: string,
): Record<string, string>[] {
  const raw: DocuSignSignHereTab[] =
    signer.signHereTabs && signer.signHereTabs.length > 0
      ? signer.signHereTabs
      : signer.signHere
        ? [signer.signHere]
        : [];
  return raw.map((t) => tabToApi(t, recipientId));
}

export async function sendEnvelopeViaDocuSign(params: {
  emailSubject: string;
  documentBase64: string;
  documentName?: string;
  status?: "sent" | "created";
  externalReference?: string;
  signers: DocuSignBridgeSigner[];
}): Promise<{ envelopeId: string; status: string | undefined }> {
  const { accessToken, accountId, restBase } = await getDocuSignContext();

  const signers = params.signers;
  if (!signers.length) {
    throw new Error("At least one signer is required.");
  }

  const docusignSigners = signers.map((s, index) => {
    const recipientId = String(index + 1);
    const signHereTabs = normalizeTabsForSigner(s, recipientId);
    if (!signHereTabs.length) {
      throw new Error(
        `Signer ${index + 1}: signHere or signHereTabs is required when using the signers array.`,
      );
    }
    return {
      email: s.email,
      name: s.name,
      recipientId,
      routingOrder: String(s.routingOrder),
      tabs: { signHereTabs },
    };
  });

  const envelopeDefinition: Record<string, unknown> = {
    emailSubject: params.emailSubject,
    status: params.status ?? "sent",
    documents: [
      {
        documentBase64: params.documentBase64,
        name: params.documentName ?? "document.pdf",
        fileExtension: "pdf",
        documentId: "1",
      },
    ],
    recipients: {
      signers: docusignSigners,
    },
  };

  if (params.externalReference) {
    envelopeDefinition.customFields = {
      textCustomFields: [
        {
          name: "externalReference",
          value: params.externalReference,
          show: "false",
          required: "false",
        },
      ],
    };
  }

  const url = `${restBase}/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(envelopeDefinition),
  });

  const payload = (await res.json()) as {
    envelopeId?: string;
    status?: string;
    errorCode?: string;
    message?: string;
  };

  if (!res.ok || !payload.envelopeId) {
    throw new Error(
      `DocuSign createEnvelope failed: ${payload.errorCode ?? res.status} ${payload.message ?? JSON.stringify(payload)}`,
    );
  }

  return { envelopeId: payload.envelopeId, status: payload.status };
}
