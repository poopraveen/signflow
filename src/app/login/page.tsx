"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function LoginInner() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "Configuration") {
      setError(
        "Auth configuration error: on Vercel set AUTH_SECRET (random base64), GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET for Production. In Google Cloud OAuth client, add redirect URI https://YOUR_HOST/api/auth/callback/google. Check GET /api/health/auth for flags.",
      );
    } else if (err === "AccessDenied") {
      setError("Sign-in was cancelled or access was denied.");
    } else if (err) {
      setError(`Sign-in failed (${err}). Try again or open /api/health/auth.`);
    }
  }, [searchParams]);

  return (
    <div className="mx-auto flex min-h-[55vh] w-full max-w-md flex-col justify-center px-3 py-12 sm:min-h-[60vh] sm:px-4 sm:py-16">
      <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-lg backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/85 sm:p-8">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Sign in to SignFlow</h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base dark:text-slate-400">
          Use your Google account to manage envelopes and create API keys for integrations.
        </p>
        {error ? (
          <p className="mt-4 rounded-lg border border-red-200/80 bg-red-50/95 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void signIn("google", { callbackUrl })}
          className="mt-8 flex min-h-12 w-full items-center justify-center rounded-full bg-indigo-600 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500"
        >
          Continue with Google
        </button>
        <Link
          href="/"
          className="mt-6 block min-h-11 text-center text-sm text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center text-slate-500">Loading…</div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
