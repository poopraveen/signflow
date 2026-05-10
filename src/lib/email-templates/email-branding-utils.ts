/** Utilities for tenant email branding and safe custom HTML. */

const HEX = /^#[0-9A-Fa-f]{6}$/;

export function normalizeHex(input: string | undefined | null, fallback: string): string {
  const t = (input ?? "").trim();
  return HEX.test(t) ? t : fallback;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const t = hex.trim();
  const m = /^#?([0-9a-f]{6})$/i.exec(t);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbaFromHex(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(79, 70, 229, ${alpha})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

/** Strip risky markup; keep tenant HTML conservative for email clients. */
export function sanitizeEmailHtml(html: string): string {
  let s = html.slice(0, 48_000);
  s = s.replace(/<\/(?:script|style|iframe|object|embed)[^>]*>/gi, "");
  s = s.replace(/<(?:script|style|iframe|object|embed)\b[\s\S]*?<\/(?:script|style|iframe|object|embed)>/gi, "");
  s = s.replace(/<(?:script|style|iframe|object|embed)\b[^>]*\/?>/gi, "");
  s = s.replace(/<\/?(?:form|input|button|textarea|select|option|meta|link|base)\b[^>]*>/gi, "");
  s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  s = s.replace(/javascript\s*:/gi, "");
  s = s.replace(/data\s*:\s*text\/html/gi, "");
  return s;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;");
}

export function buildSignButtonHtml(signUrl: string, primaryHex: string, accentHex: string): string {
  const href = escapeAttr(signUrl);
  const p = normalizeHex(primaryHex, "#4f46e5");
  const a = normalizeHex(accentHex, "#7c3aed");
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;border-radius:999px;font-size:15px;font-weight:700;text-decoration:none;color:#ffffff;background:linear-gradient(125deg,${p} 0%,${a} 52%,#059669 100%);background-color:${p};box-shadow:0 4px 14px ${rgbaFromHex(p, 0.35)};">Review &amp; sign document</a>`;
}

export type PlaceholderMap = Record<string, string>;

export function applyEmailPlaceholders(html: string, map: PlaceholderMap): string {
  let out = html;
  for (const [key, val] of Object.entries(map)) {
    const token = `{{${key}}}`;
    const parts = out.split(token);
    out = parts.join(val);
  }
  return out;
}

export function wrapCustomEmailFragment(fragment: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Signature requested</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        ${fragment}
      </td>
    </tr>
  </table>
</body>
</html>`;
}
