/** Resolve JWT/session secret for Auth.js (NextAuth v5). */
export function getAuthSecret(): string | undefined {
  const s =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV !== "production") {
    return "dev-only-insecure-secret-not-for-production";
  }
  return undefined;
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}
