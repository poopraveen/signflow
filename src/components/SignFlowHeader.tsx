"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useId, useState } from "react";

function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

type NavItem = { href: string; label: string; match: (path: string) => boolean };

const SESSION_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", match: (p) => p === "/dashboard" },
  {
    href: "/settings/api-docs",
    label: "API docs",
    match: (p) => p.startsWith("/settings/api-docs"),
  },
  {
    href: "/settings/api-keys",
    label: "API keys",
    match: (p) => p.startsWith("/settings/api-keys"),
  },
  {
    href: "/settings/email-branding",
    label: "Email branding",
    match: (p) => p.startsWith("/settings/email-branding"),
  },
  {
    href: "/envelope/new",
    label: "New envelope",
    match: (p) =>
      p === "/envelope/new" || /^\/envelope\/[^/]+\/prepare$/.test(p),
  },
];

export function SignFlowHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isPublicSignPage = pathname.startsWith("/sign/");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((o) => !o), []);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const linkBase =
    "flex min-h-12 items-center rounded-xl px-3.5 text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900";

  const linkIdle = "text-slate-300 hover:bg-white/10 hover:text-white";

  const linkActive =
    "bg-gradient-to-r from-indigo-500/35 to-violet-500/25 text-white shadow-inner shadow-indigo-900/40 ring-1 ring-indigo-400/50";

  const desktopLink = (active: boolean) => cx(linkBase, "md:min-h-10 md:px-3", active ? linkActive : linkIdle);

  const mobileLink = (active: boolean) => cx(linkBase, "w-full justify-between gap-2 py-3", active ? linkActive : linkIdle);

  return (
    <header className="sticky top-0 z-50 border-b border-indigo-500/25 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white shadow-lg shadow-indigo-950/40 backdrop-blur-xl dark:border-indigo-400/20 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950">
      <div className="relative mx-auto max-w-6xl px-3 sm:px-4">
        <div className="flex h-14 items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link
              href="/"
              className="flex min-h-11 min-w-0 shrink-0 items-center gap-2 rounded-lg font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              onClick={closeMenu}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm text-white shadow-md shadow-indigo-900/50">
                SF
              </span>
              <span className="truncate">SignFlow</span>
            </Link>
            {isPublicSignPage && !session ? (
              <p className="hidden min-w-0 flex-1 text-xs leading-snug text-slate-400 sm:line-clamp-1 lg:block">
                No account required — use your email link.
              </p>
            ) : null}
          </div>

          {/* Desktop nav */}
          <nav
            className="hidden items-center gap-1 md:flex md:gap-0.5 lg:gap-1"
            aria-label="Main"
          >
            {isPublicSignPage && !session ? (
              <Link href="/" className={desktopLink(pathname === "/")} onClick={closeMenu}>
                Home
              </Link>
            ) : null}
            {session ? (
              <>
                {SESSION_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={desktopLink(item.match(pathname))}
                    onClick={closeMenu}
                  >
                    {item.label}
                  </Link>
                ))}
                <span className="hidden max-w-[120px] truncate px-2 text-xs text-slate-500 lg:inline xl:max-w-[160px]">
                  {session.user?.email}
                </span>
                <button
                  type="button"
                  onClick={() => void signOut({ callbackUrl: "/" })}
                  className={cx(
                    linkBase,
                    "md:min-h-10 md:px-3",
                    "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                  )}
                >
                  Sign out
                </button>
              </>
            ) : !isPublicSignPage ? (
              <>
                <Link href="/login" className={desktopLink(pathname === "/login")} onClick={closeMenu}>
                  Sign in
                </Link>
                <button
                  type="button"
                  onClick={() => void signIn("google", { callbackUrl: "/dashboard" })}
                  className="ml-1 inline-flex min-h-10 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-900/40 hover:from-indigo-400 hover:to-violet-500"
                >
                  Continue with Google
                </button>
              </>
            ) : null}
            {status === "loading" ? (
              <span className="px-2 text-xs text-slate-500">…</span>
            ) : null}
          </nav>

          {/* Mobile menu button */}
          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 md:hidden"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={toggleMenu}
          >
            <span className="relative block h-3.5 w-5">
              <span
                className={cx(
                  "absolute left-0 block h-0.5 w-5 rounded-full bg-current transition-transform duration-200",
                  menuOpen ? "top-1.5 rotate-45" : "top-0",
                )}
              />
              <span
                className={cx(
                  "absolute left-0 top-1.5 block h-0.5 w-5 rounded-full bg-current transition-opacity duration-200",
                  menuOpen ? "opacity-0" : "opacity-100",
                )}
              />
              <span
                className={cx(
                  "absolute left-0 block h-0.5 w-5 rounded-full bg-current transition-transform duration-200",
                  menuOpen ? "top-1.5 -rotate-45" : "top-3",
                )}
              />
            </span>
          </button>
        </div>

        {/* Mobile sheet */}
        {menuOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 top-14 z-40 bg-slate-950/75 backdrop-blur-sm md:hidden"
              aria-label="Close menu"
              onClick={closeMenu}
            />
            <div
              id={menuId}
              className="absolute left-0 right-0 top-full z-50 max-h-[min(85dvh,calc(100dvh-3.5rem))] overflow-y-auto border-b border-indigo-500/30 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 shadow-2xl md:hidden dark:border-indigo-400/25"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="space-y-1 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {isPublicSignPage && !session ? (
                  <>
                    <p className="px-1 pb-2 text-xs leading-relaxed text-slate-400">
                      No account required — use the link from your email to sign.
                    </p>
                    <Link href="/" className={mobileLink(pathname === "/")} onClick={closeMenu}>
                      <span>Home</span>
                      {pathname === "/" ? <ActivePill /> : null}
                    </Link>
                  </>
                ) : null}

                {session ? (
                  <>
                    {SESSION_NAV.map((item) => {
                      const active = item.match(pathname);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={mobileLink(active)}
                          onClick={closeMenu}
                        >
                          <span>{item.label}</span>
                          {active ? <ActivePill /> : null}
                        </Link>
                      );
                    })}
                    <div className="my-3 border-t border-white/10" />
                    <p className="truncate px-1 text-xs text-slate-500">{session.user?.email}</p>
                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        void signOut({ callbackUrl: "/" });
                      }}
                      className={cx(
                        linkBase,
                        "w-full justify-center border border-white/10 text-slate-300 hover:bg-white/10",
                      )}
                    >
                      Sign out
                    </button>
                  </>
                ) : !isPublicSignPage ? (
                  <>
                    <Link href="/login" className={mobileLink(pathname === "/login")} onClick={closeMenu}>
                      <span>Sign in</span>
                      {pathname === "/login" ? <ActivePill /> : null}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        void signIn("google", { callbackUrl: "/dashboard" });
                      }}
                      className="mt-2 flex min-h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40"
                    >
                      Continue with Google
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}

function ActivePill() {
  return (
    <span className="shrink-0 rounded-full bg-emerald-500/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/40">
      Here
    </span>
  );
}
