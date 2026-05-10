/**
 * HTML + plain text for “please sign” invitation emails.
 * Supports per-tenant branding (see Settings → Email branding).
 */

import {
  applyEmailPlaceholders,
  buildSignButtonHtml,
  escapeAttr,
  escapeHtml,
  normalizeHex,
  rgbaFromHex,
  sanitizeEmailHtml,
  wrapCustomEmailFragment,
} from "@/lib/email-templates/email-branding-utils";
import type { TenantEmailBranding } from "@/lib/types";

export type SignInviteEmailParams = {
  signerName: string;
  envelopeTitle: string;
  signUrl: string;
  appOrigin: string;
};

function isHttpsUrl(s: string): boolean {
  return /^https:\/\/.+/i.test(s) && s.length < 2048;
}

export function buildSignInvitePlainText(
  p: SignInviteEmailParams,
  branding?: TenantEmailBranding | null,
): string {
  const org = branding?.companyName?.trim() || "SignFlow";
  const lines = [
    `Hi ${p.signerName},`,
    "",
    `You have a document waiting for your signature from ${org}.`,
    "",
    `Document: ${p.envelopeTitle}`,
    "",
    `Open your personal signing link (do not share — it is unique to you):`,
    p.signUrl,
    "",
    `If the button does not work, copy the link above into your browser.`,
    "",
    `— ${org}`,
    p.appOrigin.replace(/\/$/, ""),
    "",
  ];
  if (branding?.footerNote?.trim()) {
    lines.push(branding.footerNote.trim(), "");
  }
  lines.push("If you did not expect this message, you can ignore it.");
  return lines.join("\n");
}

export function buildSignInviteHtml(
  p: SignInviteEmailParams,
  branding?: TenantEmailBranding | null,
): string {
  const primary = normalizeHex(branding?.primaryColor, "#4f46e5");
  const accent = normalizeHex(branding?.accentColor, "#7c3aed");
  const companyLabel = escapeHtml(branding?.companyName?.trim() || "SignFlow");
  const name = escapeHtml(p.signerName);
  const title = escapeHtml(p.envelopeTitle);
  const url = escapeHtml(p.signUrl);
  const origin = escapeHtml(p.appOrigin.replace(/\/$/, ""));
  const originAttr = escapeAttr(p.appOrigin.replace(/\/$/, ""));

  if (branding?.useCustomHtml && branding.customHtml?.trim()) {
    const raw = sanitizeEmailHtml(branding.customHtml);
    const inner = applyEmailPlaceholders(raw, {
      SIGNER_NAME: name,
      DOCUMENT_TITLE: title,
      SIGN_URL: url,
      APP_ORIGIN: origin,
      COMPANY_NAME: companyLabel,
      SIGN_BUTTON: buildSignButtonHtml(p.signUrl, primary, accent),
    });
    const wrapped = wrapCustomEmailFragment(
      `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">${inner}</table>`,
    );
    return wrapped;
  }

  const headerBg = `background:linear-gradient(125deg,${primary} 0%,${accent} 48%,#059669 100%);background-color:${primary};`;
  const footerBg = `background:linear-gradient(90deg,${rgbaFromHex(primary, 0.14)} 0%,${rgbaFromHex(accent, 0.12)} 45%,#ecfdf5 100%);background-color:#eef2ff;`;
  const logoBlock =
    branding?.logoUrl && isHttpsUrl(branding.logoUrl.trim())
      ? `<div style="margin-bottom:12px;"><img src="${escapeAttr(branding.logoUrl.trim())}" alt="" width="140" style="max-width:140px;height:auto;display:inline-block;border:0;" /></div>`
      : "";

  const introDefault = `Please open the secure link below to view the PDF and complete your fields. The link works on phone or desktop — no SignFlow account required.`;
  const introBody = branding?.introText?.trim()
    ? escapeHtml(branding.introText.trim())
    : introDefault;

  const footerExtra = branding?.footerNote?.trim()
    ? `<p style="margin:0 0 8px;font-size:12px;color:#475569;">${escapeHtml(branding.footerNote.trim())}</p>`
    : "";

  const cta = buildSignButtonHtml(p.signUrl, primary, accent);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Signature requested</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:linear-gradient(180deg,#e8eefc 0%,#f1f5f9 40%,#f8fafc 100%);background-color:#f1f5f9;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;border-radius:18px;overflow:hidden;box-shadow:0 16px 48px -12px ${rgbaFromHex(primary, 0.35)};">
          <tr>
            <td style="${headerBg}padding:26px 24px;text-align:center;">
              ${logoBlock}
              <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,0.2);color:#ffffff;font-size:11px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;">
                ${companyLabel}
              </div>
              <h1 style="margin:14px 0 0;font-size:22px;line-height:1.25;font-weight:700;color:#ffffff;">
                Signature requested
              </h1>
              <p style="margin:10px 0 0;font-size:15px;line-height:1.45;color:rgba(255,255,255,0.93);">
                A document is ready for you to review and sign.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:28px 24px 8px;">
              <p style="margin:0;font-size:16px;line-height:1.5;color:#0f172a;">
                Hi <strong style="color:${primary};">${name}</strong>,
              </p>
              <p style="margin:16px 0 0;font-size:15px;line-height:1.55;color:#334155;">
                ${introBody}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:8px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-radius:12px;border:1px solid #e2e8f0;background:linear-gradient(180deg,#fafbff 0%,#f8fafc 100%);background-color:#f8fafc;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">
                      Document
                    </p>
                    <p style="margin:0;font-size:17px;font-weight:600;color:#0f172a;line-height:1.35;">
                      ${title}
                    </p>
                    <p style="margin:14px 0 6px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">
                      Signer
                    </p>
                    <p style="margin:0;font-size:15px;color:#334155;">
                      ${name}
                    </p>
                    <p style="margin:14px 0 6px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">
                      Your personal link
                    </p>
                    <p style="margin:0;font-size:12px;word-break:break-all;color:#475569;font-family:ui-monospace,Menlo,Consolas,monospace;">
                      ${url}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:20px 24px 28px;text-align:center;">
              ${cta}
              <p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#64748b;">
                This link is unique to your email. Do not forward it if others should not sign on your behalf.
              </p>
            </td>
          </tr>
          <tr>
            <td style="${footerBg}padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0;">
              ${footerExtra}
              <p style="margin:0;font-size:12px;color:#475569;">
                Sent via <strong style="color:${primary};">SignFlow</strong> for <strong style="color:${accent};">${companyLabel}</strong><br />
                <a href="${originAttr}" style="color:${accent};text-decoration:none;font-weight:600;">${origin}</a>
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#94a3b8;">
                If you did not expect this message, you can ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
