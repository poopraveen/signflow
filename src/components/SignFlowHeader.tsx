"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

export function SignFlowHeader() {
  const { data: session, status } = useSession();

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">
            SF
          </span>
          SignFlow
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600 dark:text-slate-300 sm:gap-6">
          {session ? (
            <>
              <Link href="/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                Dashboard
              </Link>
              <Link
                href="/settings/api-docs"
                className="hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                API docs
              </Link>
              <Link
                href="/settings/api-keys"
                className="hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                API keys
              </Link>
              <Link
                href="/envelope/new"
                className="rounded-full bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
              >
                New envelope
              </Link>
              <span className="hidden max-w-[140px] truncate text-xs text-slate-500 sm:inline dark:text-slate-400">
                {session.user?.email}
              </span>
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: "/" })}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-100"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                Sign in
              </Link>
              <button
                type="button"
                onClick={() => void signIn("google", { callbackUrl: "/dashboard" })}
                className="rounded-full bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
              >
                Continue with Google
              </button>
            </>
          )}
          {status === "loading" ? (
            <span className="text-xs text-slate-400">…</span>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
