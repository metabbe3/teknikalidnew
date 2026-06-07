import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { getAvatarUrl } from "@/lib/avatar";
import { USERNAME_REGEX } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { authRepository } from "./auth.repository";
import {
  NotAuthenticatedError, AccountSuspendedError, AdminRequiredError,
  EmailTakenError, UsernameTakenError, ValidationError,
} from "./auth.errors";

export const authService = {
  async getCurrentUser() {
    const session = await auth();
    if (!session?.user?.id) return null;
    return authRepository.findUserById(session.user.id);
  },

  async requireAuth() {
    const user = await this.getCurrentUser();
    if (!user) throw new NotAuthenticatedError();
    if (user.bannedAt) throw new AccountSuspendedError();
    return user;
  },

  async requireAdmin() {
    const user = await this.requireAuth();
    if (user.role !== "ADMIN") throw new AdminRequiredError();
    return user;
  },

  async register(email: string, password: string, confirmPassword: string) {
    if (!email || !password) throw new ValidationError("Email dan password wajib diisi");
    if (password.length < 8) throw new ValidationError("Password minimal 8 karakter");
    if (password !== confirmPassword) throw new ValidationError("Password tidak cocok");

    const existing = await authRepository.findUserByEmail(email);
    if (existing) throw new EmailTakenError();

    const hashedPassword = await bcrypt.hash(password, 12);
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    await authRepository.createUserWithCredentials(email, `user_${suffix}`, hashedPassword);
  },

  async getProfile(userId: string) {
    return authRepository.getUserProfile(userId);
  },

  async updateProfile(userId: string, data: { name?: string; bio?: string; username?: string; socialLinks?: Record<string, string> }) {
    if (data.name !== undefined && typeof data.name !== "string") throw new ValidationError("Name must be a string");
    if (data.bio !== undefined) {
      if (typeof data.bio !== "string") throw new ValidationError("Bio must be a string");
      if (data.bio.length > 200) throw new ValidationError("Bio must be 200 characters or less");
    }
    if (data.username !== undefined) {
      if (!USERNAME_REGEX.test(data.username)) {
        throw new ValidationError("Username must be 3-20 characters and contain only letters, numbers, and underscores");
      }
      const existing = await authRepository.findUserByUsername(data.username);
      if (existing && existing.id !== userId) throw new UsernameTakenError();
    }
    if (data.socialLinks !== undefined) {
      const allowed = ["twitter", "instagram", "facebook", "linkedin", "youtube"];
      const links = data.socialLinks;
      if (typeof links !== "object" || links === null) throw new ValidationError("Invalid social links");
      for (const [key, val] of Object.entries(links)) {
        if (!allowed.includes(key)) throw new ValidationError(`Invalid platform: ${key}`);
        if (typeof val !== "string") throw new ValidationError(`Invalid value for ${key}`);
      }
    }

    const fields = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    if (Object.keys(fields).length === 0) throw new ValidationError("No fields to update");

    return authRepository.updateUser(userId, fields);
  },

  async completeProfile(userId: string, username: string, name?: string) {
    if (!username) throw new ValidationError("Username wajib diisi");
    if (typeof username !== "string") throw new ValidationError("Invalid input types");
    if (!USERNAME_REGEX.test(username)) {
      throw new ValidationError("Username must be 3-20 characters and contain only letters, numbers, and underscores");
    }

    const existing = await authRepository.findUserByUsername(username);
    if (existing) throw new UsernameTakenError();

    return authRepository.updateUser(userId, { username, ...(name ? { name } : {}) });
  },

  checkUsernameFormat(username: string): boolean {
    return USERNAME_REGEX.test(username);
  },

  async isUsernameAvailable(username: string): Promise<boolean> {
    const existing = await authRepository.findUserByUsername(username);
    return !existing;
  },

  async searchUsers(query: string, userId?: string, limit = 8) {
    if (!query || query.length < 1) return [];
    const users = await authRepository.searchUsers(query, limit + 20);

    if (!userId) {
      return users.slice(0, limit).map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        image: getAvatarUrl(u.image, u.email),
        reputation: u.reputation,
        isFollowing: false,
      }));
    }

    const follows = await prisma.follow.findMany({
      where: { followerId: userId, followingId: { in: users.map((u) => u.id) } },
      select: { followingId: true },
    });
    const followingIds = new Set(follows.map((f) => f.followingId));

    const enriched = users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      image: getAvatarUrl(u.image, u.email),
      reputation: u.reputation,
      isFollowing: followingIds.has(u.id),
    }));

    enriched.sort((a, b) => (a.isFollowing === b.isFollowing ? 0 : a.isFollowing ? -1 : 1));
    return enriched.slice(0, limit);
  },
};
