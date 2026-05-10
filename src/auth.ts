import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getAuthSecret } from "@/lib/auth-env";

const googleId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: getAuthSecret(),
  providers: [
    Google({
      clientId: googleId,
      clientSecret: googleSecret,
    }),
  ],
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
