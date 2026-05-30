import { prisma } from "@/lib/prisma";
import { NotificationType } from "@/generated/prisma/client";

export const notificationRepository = {
  create(data: {
    type: NotificationType;
    recipientId: string;
    actorId: string;
    postId?: string;
    commentId?: string;
  }) {
    return prisma.notification.create({ data });
  },

  createMany(
    items: Array<{
      type: NotificationType;
      recipientId: string;
      actorId: string;
      postId?: string;
      commentId?: string;
    }>
  ) {
    return prisma.notification.createMany({ data: items });
  },

  findByRecipient(recipientId: string, take: number = 20) {
    return prisma.notification.findMany({
      where: { recipientId },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        actor: { select: { id: true, username: true, name: true, image: true } },
        post: { select: { id: true, content: true } },
      },
    });
  },

  countUnread(recipientId: string) {
    return prisma.notification.count({
      where: { recipientId, read: false },
    });
  },

  markAsRead(id: string, recipientId: string) {
    return prisma.notification.update({
      where: { id, recipientId },
      data: { read: true },
    });
  },

  markAllAsRead(recipientId: string) {
    return prisma.notification.updateMany({
      where: { recipientId, read: false },
      data: { read: true },
    });
  },

  deleteOlderThan(recipientId: string, olderThan: Date) {
    return prisma.notification.deleteMany({
      where: { recipientId, createdAt: { lt: olderThan } },
    });
  },
};
