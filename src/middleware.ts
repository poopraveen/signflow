import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (req.auth) return NextResponse.next();
  const path = req.nextUrl.pathname;
  if (
    path.startsWith("/dashboard") ||
    path.startsWith("/envelope") ||
    path.startsWith("/settings")
  ) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", path + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/envelope/:path*", "/settings/:path*"],
};
