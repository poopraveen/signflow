import { NextResponse } from "next/server";
import { getAuthSecret, isGoogleOAuthConfigured } from "@/lib/auth-env";

/**
 * Quick deploy check: which auth env vars are present (no secret values exposed).
 * Open GET /api/health/auth on your deployed site if Google sign-in shows "Server configuration" error.
 */
export async function GET() {
  const hasSecret = Boolean(getAuthSecret());
  const hasGoogle = isGoogleOAuthConfigured();
  const authReady = hasSecret && hasGoogle;

  const hints: string[] = [];
  if (!hasSecret) {
    hints.push(
      "Set AUTH_SECRET in Vercel (Production): run `openssl rand -base64 32` and paste the value.",
    );
  }
  if (!hasGoogle) {
    hints.push(
      "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (OAuth 2.0 Web client from Google Cloud Console).",
    );
  }
  if (hasGoogle) {
    hints.push(
      "In Google Cloud → Credentials → your OAuth client: Authorized redirect URIs must include https://YOUR_DOMAIN/api/auth/callback/google",
    );
  }

  return NextResponse.json({
    authReady,
    hasAuthSecret: hasSecret,
    hasGoogleOAuth: hasGoogle,
    /** On Vercel, ensure these env vars are attached to "Production", not only Preview. */
    hints,
  });
}
