import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PostCard } from "@/components/community/post-card";
import { CommentList } from "@/components/community/comment-list";
import { CommentForm } from "@/components/community/comment-form";
import { PostRealtimeWrapper } from "@/components/community/post-realtime-wrapper";

export const revalidate = 60;

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, username: true, name: true, image: true } },
      likes: session?.user?.id
        ? { where: { userId: session.user.id }, select: { id: true } }
        : { select: { userId: true } },
      comments: {
        take: 20,
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, username: true, name: true, image: true } },
          replies: {
            orderBy: { createdAt: "asc" },
            include: {
              author: { select: { id: true, username: true, name: true, image: true } },
              parent: {
                select: {
                  id: true,
                  content: true,
                  author: { select: { id: true, username: true, name: true, image: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!post) notFound();

  const serializedPost = {
    id: post.id,
    content: post.content,
    tickerTag: post.tickerTag,
    predictionDirection: post.predictionDirection ?? null,
    predictionTarget: post.predictionTarget ? String(post.predictionTarget) : null,
    predictionOutcome: post.predictionOutcome ?? null,
    imageUrl: post.imageUrl ?? null,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    repostsCount: post.repostsCount ?? 0,
    createdAt: post.createdAt.toISOString(),
    author: post.author,
    likedByMe: session?.user?.id ? post.likes.length > 0 : false,
  };

  const allComments = post.comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    author: comment.author,
    parentId: comment.parentId,
    replies: comment.replies.map((reply) => ({
      id: reply.id,
      content: reply.content,
      createdAt: reply.createdAt.toISOString(),
      author: reply.author,
      parentId: reply.parentId,
      parent: reply.parent
        ? { id: reply.parent.id, content: reply.parent.content, author: reply.parent.author }
        : null,
    })),
  }));

  const serializedComments = allComments.filter((c) => !c.parentId);

  return (
    <PostRealtimeWrapper postId={post.id}>
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 fade-in">
      {/* Back link */}
      <Link
        href="/community"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <span aria-hidden="true">&larr;</span> Kembali ke Komunitas
      </Link>

      {/* Main post */}
      <PostCard post={serializedPost} />

      {/* Comments section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Komentar ({post.commentsCount})
        </h2>

        {session?.user?.id ? (
          <CommentForm postId={post.id} />
        ) : (
          <div className="bg-bg-card depth-shadow rounded-xl p-4 text-center">
            <p className="text-sm text-text-secondary">
              <Link href="/auth/signin" className="text-accent hover:underline font-medium">
                Masuk
              </Link>{" "}
              untuk berkomentar
            </p>
          </div>
        )}

        <CommentList
          postId={post.id}
          comments={serializedComments}
          currentUserId={session?.user?.id}
          userRole={session?.user?.role}
        />
      </div>
    </div>
    </PostRealtimeWrapper>
  );
}
