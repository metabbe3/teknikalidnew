import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { AdapterUser } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authRepository } from "@/domains/auth/auth.repository";
import { getAvatarUrl } from "@/lib/avatar";
import type { NextAuthConfig } from "next-auth";

// Augment JWT with custom fields
declare module "next-auth/jwt" {
  interface JWT {
    username?: string;
    role?: string;
    image?: string;
    rememberMe?: boolean;
    loginAt?: number;
    checkedAt?: number;
  }
}

export const authConfig: NextAuthConfig = {
  adapter: {
    ...PrismaAdapter(prisma),
    async createUser(data: AdapterUser) {
      const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
      const emailVerified = data.emailVerified ?? new Date();
      const user = await authRepository.createUser({
        email: data.email,
        name: data.name ?? undefined,
        image: data.image ?? undefined,
        emailVerified,
        username: `user_${suffix}`,
      });
      return { ...data, ...user, emailVerified: emailVerified ?? null } as AdapterUser;
    },
  },
  // NextAuth v5 auto-configures secure cookies in production:
  // - __Secure-authjs.session-token (httpOnly, sameSite=lax, secure=true)
  // - authjs.session-token in development
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember Me", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await authRepository.findUserByEmail(credentials.email as string);
        if (!user) return null;
        if (user.bannedAt) return null;

        const account = await authRepository.findCredentialsAccount(user.id);
        if (!account?.access_token) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          account.access_token
        );
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name, image: getAvatarUrl(user.image, user.email), rememberMe: credentials.rememberMe === "true" };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      const dbUser = await authRepository.findUserByEmail(user.email);
      if (dbUser?.bannedAt) return false;
      // OAuth login (Google) verifies email — update if not yet verified
      if (account?.type === "oauth" && dbUser && !dbUser.emailVerified) {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { emailVerified: new Date() },
        });
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        const dbUser = await authRepository.findUserByEmail(user.email!);
        if (dbUser) {
          token.id = dbUser.id;
          token.username = dbUser.username;
          token.role = dbUser.role;
          token.image = getAvatarUrl(dbUser.image, dbUser.email);
          token.rememberMe = (user as { rememberMe?: boolean }).rememberMe ?? false;
          token.loginAt = Date.now();
          token.checkedAt = Date.now();
        }
      }
      // ponytail: throttled revalidation. JWT is stateless and can't be revoked, so a
      // ban wouldn't take effect until the 7-day cookie expired. Re-check the DB every
      // REVALIDATE_MS (or immediately on an explicit update trigger) to propagate bans
      // and role changes. Ceiling: a ban takes ≤REVALIDATE_MS to log the user out.
      // 60s so a banned scraper's session dies within ~1 min (was 5 min); cost is one
      // findUserById per active session per 60s. Upgrade path: per-request check or a
      // server-side session store if 60s is still too loose or DB load too high.
      const REVALIDATE_MS = 60_000;
      const stale =
        trigger === "update" ||
        !token.checkedAt ||
        Date.now() - token.checkedAt > REVALIDATE_MS;
      if (token.id && stale) {
        const dbUser = await authRepository.findUserById(token.id as string);
        if (!dbUser || dbUser.bannedAt) {
          return { ...token, id: undefined };
        }
        token.role = dbUser.role;
        token.image = getAvatarUrl(dbUser.image, dbUser.email);
        token.checkedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as unknown as Record<string, unknown>;
        u.id = token.id as string;
        u.username = token.username as string;
        u.role = token.role as string;
        u.image = (token.image as string) ?? null;
        u.rememberMe = token.rememberMe as boolean;
        u.loginAt = token.loginAt as number;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
