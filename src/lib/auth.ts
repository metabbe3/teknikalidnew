import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authRepository } from "@/domains/auth/auth.repository";
import { getAvatarUrl } from "@/lib/avatar";
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  adapter: {
    ...PrismaAdapter(prisma),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async createUser(data: any) {
      const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
      // OAuth providers (Google) verify emails — mark as verified immediately
      const emailVerified = data.emailVerified ?? new Date();
      const user = await authRepository.createUser({
        ...data,
        emailVerified,
        username: `user_${suffix}`,
      });
      return { ...user, emailVerified } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    },
  },
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
          token.rememberMe = (user as any).rememberMe ?? false;
          token.loginAt = Date.now();
        }
      }
      // Refresh role from DB on update trigger (covers role changes, bans)
      if (trigger === "update" && token.id) {
        const dbUser = await authRepository.findUserById(token.id as string);
        if (!dbUser || dbUser.bannedAt) {
          return { ...token, id: undefined };
        }
        token.role = dbUser.role;
        token.image = getAvatarUrl(dbUser.image, dbUser.email);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.image = (token.image as string) ?? null;
        (session.user as any).rememberMe = token.rememberMe as boolean;
        (session.user as any).loginAt = token.loginAt as number;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
