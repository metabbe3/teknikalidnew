import { prisma } from "@/lib/prisma";

export const imageGenRepository = {
  createJob(data: {
    prompt: string;
    source: string;
    requestedBy: string;
    postId?: string;
  }) {
    return prisma.imageGenerationJob.create({
      data: {
        prompt: data.prompt,
        source: data.source,
        requestedBy: data.requestedBy,
        postId: data.postId ?? null,
      },
    });
  },

  findJobById(id: string) {
    return prisma.imageGenerationJob.findUnique({ where: { id } });
  },

  updateJobStatus(
    id: string,
    data: {
      status: string;
      comfyuiPromptId?: string;
      outputFilename?: string;
      imageUrl?: string;
      error?: string;
      completedAt?: Date;
    }
  ) {
    return prisma.imageGenerationJob.update({ where: { id }, data });
  },

  findPendingJobs(limit: number) {
    return prisma.imageGenerationJob.findMany({
      where: { status: { in: ["pending", "processing"] } },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  },
};
