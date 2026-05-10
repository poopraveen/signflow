"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";

export function SignFlowHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isPublicSignPage = pathname.startsWith("/sign/");

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-3 py-3 sm:h-14 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-0">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <Link
            href="/"
            className="flex min-h-11 min-w-0 items-center gap-2 font-semibold text-slate-900 dark:text-white"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white shadow-sm shadow-indigo-600/25">
              SF
            </span>
            <span className="truncate">SignFlow</span>
          </Link>
          {isPublicSignPage && !session ? (
            <span className="line-clamp-2 text-xs font-normal leading-snug text-slate-500 sm:line-clamp-1 dark:text-slate-400">
              No account required — use your email link to sign.
            </span>
          ) : null}
        </div>
        <nav className="flex flex-wrap items-center justify-end gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 sm:gap-3 md:gap-4">
          {isPublicSignPage && !session ? (
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-lg px-2 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
            >
              Home
            </Link>
          ) : null}
          {session ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 items-center rounded-lg px-2 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
              >
                Dashboard
              </Link>
              <Link
                href="/settings/api-docs"
                className="inline-flex min-h-11 items-center rounded-lg px-2 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
              >
                API docs
              </Link>
              <Link
                href="/settings/api-keys"
                className="inline-flex min-h-11 items-center rounded-lg px-2 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
              >
                API keys
              </Link>
              <Link
                href="/envelope/new"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500"
              >
                New envelope
              </Link>
              <span className="hidden max-w-[140px] truncate text-xs text-slate-500 md:inline dark:text-slate-400">
                {session.user?.email}
              </span>
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: "/" })}
                className="inline-flex min-h-11 items-center rounded-lg px-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                Sign out
              </button>
            </>
          ) : !isPublicSignPage ? (
            <>
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center rounded-lg px-2 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
              >
                Sign in
              </Link>
              <button
                type="button"
                onClick={() => void signIn("google", { callbackUrl: "/dashboard" })}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500"
              >
                Continue with Google
              </button>
            </>
          ) : null}
          {status === "loading" ? (
            <span className="text-xs text-slate-400">…</span>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
