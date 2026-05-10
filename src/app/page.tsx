import Link from "next/link";

function HeroEnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M8 28 L60 58 L112 28 V82 H8 V28Z"
        className="stroke-indigo-400/50 dark:stroke-indigo-400/35"
        strokeWidth="1.5"
        fill="url(#env-grad)"
        fillOpacity="0.35"
      />
      <path
        d="M8 28 L60 4 L112 28"
        className="stroke-indigo-500/40 dark:stroke-indigo-300/30"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#flap-grad)"
        fillOpacity="0.45"
      />
      <circle cx="60" cy="52" r="5" className="fill-emerald-500/35 dark:fill-emerald-400/25" />
      <defs>
        <linearGradient id="env-grad" x1="8" y1="28" x2="112" y2="82" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818cf8" stopOpacity="0.3" />
          <stop offset="1" stopColor="#34d399" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="flap-grad" x1="60" y1="4" x2="60" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a5b4fc" stopOpacity="0.4" />
          <stop offset="1" stopColor="#c4b5fd" stopOpacity="0.2" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Home() {
  return (
    <div className="flex w-full flex-1 flex-col">
      <section className="hero-banner" aria-labelledby="hero-heading">
        <div className="hero-banner__bg" aria-hidden />
        <div className="hero-banner__orb hero-banner__orb--a" aria-hidden />
        <div className="hero-banner__orb hero-banner__orb--b" aria-hidden />
        <div className="hero-banner__orb hero-banner__orb--c" aria-hidden />
        <div className="hero-banner__fold" aria-hidden />
        <div className="hero-banner__shine" aria-hidden />

        <div className="hero-banner__content mx-auto w-full max-w-6xl px-3 sm:px-4">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/70 px-3 py-1.5 text-xs font-medium text-indigo-800 shadow-sm backdrop-blur-md dark:border-indigo-500/30 dark:bg-slate-900/50 dark:text-indigo-200">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                  aria-hidden
                />
                Envelope-ready e-signatures
              </div>

              <h1
                id="hero-heading"
                className="mt-5 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12] dark:text-white"
              >
                Seal the deal with{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-emerald-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-emerald-400">
                  beautiful
                </span>{" "}
                signing flows
              </h1>

              <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
                Upload PDFs, place fields like stamps on an envelope, and send personal links —
                powered by MongoDB &amp; GridFS. Integrate with{" "}
                <code className="rounded-md border border-slate-200/80 bg-white/80 px-1.5 py-0.5 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100">
                  POST /api/v1/envelopes
                </code>{" "}
                and your own API keys.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/envelope/new"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/35"
                >
                  Create an envelope
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300/90 bg-white/85 px-7 py-3 text-sm font-semibold text-slate-800 shadow-md backdrop-blur-md transition hover:bg-white dark:border-slate-500/50 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-800/90"
                >
                  Open dashboard
                </Link>
              </div>

              <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
                Sign in with Google to manage envelopes, or share signing links — no account needed
                for recipients.
              </p>
            </div>

            <div className="relative lg:col-span-5">
              <div className="pointer-events-none absolute -right-4 -top-6 hidden opacity-90 sm:block lg:-right-8 lg:-top-10">
                <HeroEnvelopeIcon className="h-28 w-auto text-indigo-500/20 drop-shadow-lg lg:h-36" />
              </div>

              <div className="relative rounded-2xl border border-white/60 bg-white/75 p-6 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/5 backdrop-blur-xl dark:border-slate-600/50 dark:bg-slate-900/75 dark:shadow-black/30 dark:ring-white/5 sm:p-8">
                <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent dark:via-indigo-400/25" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  How it unfolds
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Three calm steps from PDF to signed envelope.
                </p>
                <ul className="mt-6 space-y-5">
                  <li className="flex gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-md shadow-indigo-500/30">
                      1
                    </span>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Upload &amp; address</p>
                      <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                        Add your PDF and list every signer — like addressing an envelope.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-bold text-white shadow-md shadow-violet-500/25">
                      2
                    </span>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Place your fields</p>
                      <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                        Drop signatures, dates, and text exactly where they belong on each page.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-md shadow-emerald-500/25">
                      3
                    </span>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Send &amp; seal</p>
                      <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                        Each signer gets a private link; completed documents stay in your workspace.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
