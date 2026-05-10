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
      setError("Google sign-in is not configured (missing GOOGLE_CLIENT_ID / SECRET).");
    } else if (err) {
      setError("Sign-in failed. Try again.");
    }
  }, [searchParams]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sign in to SignFlow</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Use your Google account to manage envelopes and create API keys for integrations.
      </p>
      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void signIn("google", { callbackUrl })}
        className="mt-8 flex w-full justify-center rounded-full bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        Continue with Google
      </button>
      <Link
        href="/"
        className="mt-6 text-center text-sm text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
      >
        Back to home
      </Link>
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
