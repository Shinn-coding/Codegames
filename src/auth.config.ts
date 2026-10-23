import type { NextAuthConfig } from "next-auth";

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

/**
 * Auth.js rejects the Credentials provider with database sessions. Local demo
 * accounts are therefore the one JWT exception; the production Google flow
 * uses database sessions backed by the Prisma adapter.
 */
const devAuthEnabled =
  process.env.DEV_AUTH === "true" && process.env.NODE_ENV !== "production";

/**
 * Edge-safe Auth.js configuration.
 *
 * Keep this file free of Prisma, node:crypto, fs, and other Node-only imports.
 * Providers that need the database are registered in `src/auth.ts`.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: devAuthEnabled ? "jwt" : "database",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const email = user.email?.toLowerCase();
        token.role =
          email && adminEmails.includes(email)
            ? "ADMIN"
            : ((user as { role?: "USER" | "ADMIN" }).role ?? "USER");
      }
      return token;
    },
    session({ session, token, user }) {
      if (!session.user) {
        return session;
      }

      if (user) {
        session.user.id = user.id;
        session.user.role =
          (user as { role?: "USER" | "ADMIN" }).role ?? "USER";
      } else if (token) {
        session.user.id = String(token.id ?? token.sub ?? "");
        session.user.role = token.role ?? "USER";
      }

      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
