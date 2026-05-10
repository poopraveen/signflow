import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <SignFlowHeader />
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
