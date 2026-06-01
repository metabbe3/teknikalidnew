import { prisma } from "@/lib/prisma";

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, username: true, image: true, role: true, bannedAt: true },
    });
  },

  findUserByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
  },

  findCredentialsAccount(userId: string) {
    return prisma.account.findFirst({
      where: { userId, provider: "credentials" },
    });
  },

  createUser(data: { email: string; username: string; name?: string; image?: string; emailVerified?: Date | null }) {
    return prisma.user.create({ data });
  },

  createUserWithCredentials(email: string, username: string, hashedPassword: string) {
    return prisma.user.create({
      data: {
        email,
        username,
        accounts: {
          create: {
            type: "credentials",
            provider: "credentials",
            providerAccountId: email,
            access_token: hashedPassword,
          },
        },
      },
    });
  },

  updateUser(id: string, data: { name?: string; bio?: string; username?: string; image?: string; socialLinks?: any }) {
    return prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, username: true, name: true, image: true, bio: true, socialLinks: true, role: true },
    });
  },

  getUserProfile(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, name: true, image: true, bio: true, socialLinks: true, role: true },
    });
  },

  searchUsers(query: string, limit: number) {
    return prisma.user.findMany({
      where: {
        OR: [
          { username: { startsWith: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, username: true, name: true, image: true, reputation: true },
      take: limit,
    });
  },
};
