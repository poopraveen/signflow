import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { SignFlowHeader } from "@/components/SignFlowHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SignFlow — e-signatures",
  description: "Send documents, place fields, and collect signatures in the browser.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full text-slate-900 dark:text-slate-100">
        <div className="app-page-bg" aria-hidden="true" />
        <AuthSessionProvider>
          <div className="relative z-10 flex min-h-full flex-col">
            <SignFlowHeader />
            <main className="flex min-h-0 flex-1 flex-col">{children}</main>
          </div>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
