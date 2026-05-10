import Link from "next/link";

export function SignFlowHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">
            SF
          </span>
          SignFlow
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Link href="/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400">
            Dashboard
          </Link>
          <Link
            href="/envelope/new"
            className="rounded-full bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
          >
            New envelope
          </Link>
        </nav>
      </div>
    </header>
  );
}
