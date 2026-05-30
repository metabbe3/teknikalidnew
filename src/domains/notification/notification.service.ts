import { notificationRepository } from "./notification.repository";
import { eventBus } from "@/lib/event-bus";
import { socialGraphService } from "@/domains/social/social-graph.service";
import { prisma } from "@/lib/prisma";

export const notificationService = {
  async getUserNotifications(userId: string) {
    const [notifications, unreadCount] = await Promise.all([
      notificationRepository.findByRecipient(userId),
      notificationRepository.countUnread(userId),
    ]);

    return {
      data: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
        actor: n.actor,
        post: n.post
          ? { id: n.post.id, content: n.post.content.slice(0, 80) }
          : null,
      })),
      unreadCount,
    };
  },

  async markRead(
    userId: string,
    options: { markAll?: boolean; id?: string }
  ) {
    if (options.markAll) {
      await notificationRepository.markAllAsRead(userId);
    } else if (options.id) {
      await notificationRepository.markAsRead(options.id, userId);
    }
    return { success: true };
  },

  async deleteOldNotifications(userId: string, olderThan: Date) {
    return notificationRepository.deleteOlderThan(userId, olderThan);
  },

  subscribeToEvents() {
    eventBus.on("community:comment-created", async (payload) => {
      try {
        if (payload.postAuthorId && payload.postAuthorId !== payload.authorId) {
          await notificationRepository.create({
            type: "COMMENT",
            recipientId: payload.postAuthorId,
            actorId: payload.authorId,
            postId: payload.postId ?? undefined,
            commentId: payload.commentId,
          });
        }

        if (payload.mentionedUsernames.length > 0) {
          const mentionedUsers = await prisma.user.findMany({
            where: {
              username: { in: payload.mentionedUsernames },
              id: { not: payload.authorId },
            },
            select: { id: true },
          });
          if (mentionedUsers.length > 0) {
            await notificationRepository.createMany(
              mentionedUsers.map((mu) => ({
                type: "MENTION",
                recipientId: mu.id,
                actorId: payload.authorId,
                postId: payload.postId ?? undefined,
                commentId: payload.commentId,
              })),
            );
          }
        }
      } catch (e) {
        console.error("Failed to create comment notifications:", e);
      }
    });

    eventBus.on("community:post-liked", async (payload) => {
      try {
        if (payload.userId !== payload.authorId) {
          await notificationRepository.create({
            type: "LIKE",
            recipientId: payload.authorId,
            actorId: payload.userId,
            postId: payload.postId,
          });
        }
      } catch (e) {
        console.error("Failed to create like notification:", e);
      }
    });

    eventBus.on("community:post-created", async (payload) => {
      try {
        if (payload.tickerTag) {
          const followerIds = await socialGraphService.getStockFollowers(
            payload.tickerTag,
            payload.authorId,
          );
          if (followerIds.length > 0) {
            await notificationRepository.createMany(
              followerIds.map((recipientId) => ({
                type: "STOCK_POST",
                recipientId,
                actorId: payload.authorId,
                postId: payload.postId,
              })),
            );
          }
        }
      } catch (e) {
        console.error("Failed to create stock post notifications:", e);
      }
    });

    eventBus.on("social:user-followed", async (payload) => {
      try {
        await notificationRepository.create({
          type: "FOLLOW",
          recipientId: payload.followingId,
          actorId: payload.followerId,
        });
      } catch (e) {
        console.error("Failed to create follow notification:", e);
      }
    });
  },
};

notificationService.subscribeToEvents();
