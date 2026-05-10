export type FieldType = "signature" | "date" | "text";

export interface Signer {
  id: string;
  name: string;
  email: string;
  order: number;
  /** Issued when the envelope is sent; used in /sign URLs. Omitted in API responses to browsers. */
  signToken?: string;
}

export interface Field {
  id: string;
  type: FieldType;
  pageIndex: number;
  signerId: string;
  /** 0–1 relative to page width */
  x: number;
  /** 0–1 relative to page height */
  y: number;
  /** 0–1 relative to page width */
  width: number;
  /** 0–1 relative to page height */
  height: number;
  value?: string;
}

export type EnvelopeStatus = "draft" | "sent" | "completed";

/**
 * Per-tenant (per signed-in owner) branding for signing invitation emails.
 * Tenant key is `ownerUserId` (Google subject).
 */
export interface TenantEmailBranding {
  ownerUserId: string;
  companyName?: string;
  /** Public https URL to your logo (shown in the email header when set). */
  logoUrl?: string;
  /** Header / CTA gradient start, e.g. #4f46e5 */
  primaryColor?: string;
  /** Gradient mid tone, e.g. #7c3aed */
  accentColor?: string;
  /** Replaces default intro paragraph in the standard template (plain text). */
  introText?: string;
  /** Extra line in the footer (plain text). */
  footerNote?: string;
  /** When true, `customHtml` is used as the message body (see placeholders). */
  useCustomHtml?: boolean;
  /** HTML fragment; allowed placeholders: {{SIGNER_NAME}}, {{DOCUMENT_TITLE}}, {{SIGN_URL}}, {{APP_ORIGIN}}, {{COMPANY_NAME}}, {{SIGN_BUTTON}} */
  customHtml?: string;
  updatedAt: string;
}

export interface Envelope {
  id: string;
  title: string;
  /** Optional expanded context for the sender (e.g. AI-polished notes); not shown to signers in the current UI. */
  description?: string;
  status: EnvelopeStatus;
  signers: Signer[];
  fields: Field[];
  createdAt: string;
  completedAt?: string;
  /** Google `sub` (or future auth subject) — not exposed to browsers. */
  ownerUserId?: string;
}
