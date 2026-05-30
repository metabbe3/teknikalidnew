import { EventEmitter } from "events";

export interface EventMap {
  "community:comment-created": {
    commentId: string;
    authorId: string;
    postId: string | null;
    postAuthorId?: string;
    mentionedUsernames: string[];
  };
  "community:post-liked": {
    postId: string;
    userId: string;
    authorId: string;
  };
  "community:post-unliked": {
    postId: string;
    userId: string;
    authorId: string;
  };
  "community:post-created": {
    postId: string;
    authorId: string;
    tickerTag: string | null;
  };
  "social:user-followed": {
    followerId: string;
    followingId: string;
  };
  "social:user-unfollowed": {
    followerId: string;
    followingId: string;
  };
}

class TypedEventBus extends EventEmitter {
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): boolean {
    return super.emit(event, payload);
  }
  on<K extends keyof EventMap>(
    event: K,
    listener: (payload: EventMap[K]) => void | Promise<void>,
  ): this {
    return super.on(event, listener);
  }
}

export const eventBus = new TypedEventBus();
