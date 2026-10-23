import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import { isDevAuthEnabled, env } from "@/lib/env";

const providers: NextAuthConfig["providers"] = [];

// Google is the production sign-in method. It is only registered when both
// credentials are present so local demo mode can run without real secrets.
if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    }),
  );
}

// Local-only sign-in for seeded demo accounts. This provider is not registered
// in production, and authorize() also rejects production explicitly.
if (isDevAuthEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        if (!isDevAuthEnabled) {
          return null;
        }

        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";

        if (!email.endsWith("@local.test")) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          return null;
        }

        return {
          id: user.id,
          email: user.email ?? email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers,
  events: {
    async signIn({ user }) {
      if (!user.id || !user.email) {
        return;
      }

      const normalizedEmail = user.email.toLowerCase();
      if (!env.ADMIN_EMAILS.includes(normalizedEmail)) {
        return;
      }

      // Promote users listed in ADMIN_EMAILS on sign-in. This keeps Google
      // sign-in usable without a separate admin bootstrap flow.
      await prisma.user
        .update({
          where: { id: user.id },
          data: { role: "ADMIN" },
        })
        .catch(() => undefined);
    },
  },
});
