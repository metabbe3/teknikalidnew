import { eventBus } from "@/lib/event-bus";
import { getIO } from "@/lib/socket";

export function initSocketBridge() {
  eventBus.on("community:post-liked", ({ authorId, userId, postId }) => {
    try {
      if (userId !== authorId) {
        getIO().to(`user:${authorId}`).emit("notification", { type: "LIKE" });
      }
      getIO().to(`post:${postId}`).emit("community:post-updated", { postId });
    } catch (error) {
      console.error("[SocketBridge] post-liked:", error);
    }
  });

  eventBus.on("community:post-unliked", ({ postId }) => {
    try {
      getIO().to(`post:${postId}`).emit("community:post-updated", { postId });
    } catch (error) {
      console.error("[SocketBridge] post-unliked:", error);
    }
  });

  eventBus.on("community:comment-created", ({ postAuthorId, authorId, postId }) => {
    try {
      if (postAuthorId && postAuthorId !== authorId) {
        getIO()
          .to(`user:${postAuthorId}`)
          .emit("notification", { type: "COMMENT" });
      }
      if (postId) {
        getIO().to(`post:${postId}`).emit("community:new-comment", { postId });
      }
    } catch (error) {
      console.error("[SocketBridge] comment-created:", error);
    }
  });

  eventBus.on("social:user-followed", ({ followingId }) => {
    try {
      getIO().to(`user:${followingId}`).emit("notification", { type: "FOLLOW" });
    } catch (error) {
      console.error("[SocketBridge] user-followed:", error);
    }
  });

  eventBus.on("community:post-created", ({ postId, tickerTag }) => {
    try {
      getIO().to("community").emit("community:new-post", { postId });
      if (tickerTag) {
        getIO()
          .to(`stock:${tickerTag}`)
          .emit("new-post", { ticker: tickerTag });
      }
    } catch (error) {
      console.error("[SocketBridge] post-created:", error);
    }
  });
}
