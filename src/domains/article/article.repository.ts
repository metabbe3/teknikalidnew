import { prisma } from "@/lib/prisma";
import { ArticleStatus, ArticleType, Prisma } from "@/generated/prisma/client";

export const articleRepository = {
  findPublished(tags?: string[], articleType?: ArticleType) {
    return prisma.article.findMany({
      where: {
        status: ArticleStatus.PUBLISHED,
        isListed: true,
        ...(articleType ? { articleType } : {}),
        ...(tags?.length ? { tags: { hasSome: tags } } : {}),
      },
      orderBy: { publishedAt: "desc" },
      include: {
        author: { select: { id: true, username: true, name: true, image: true } },
      },
    });
  },

  findPublishedPaginated(opts: { cursor?: string; limit: number; tag?: string; articleType?: string }) {
    const where = {
      status: ArticleStatus.PUBLISHED as typeof ArticleStatus.PUBLISHED,
      isListed: true,
      articleType: opts.articleType
        ? (opts.articleType as ArticleType)
        : { in: ["STOCK_ANALYSIS", "NEWS", "GENERAL"] as ArticleType[] },
      ...(opts.tag ? { tags: { has: opts.tag } } : {}),
      ...(opts.cursor ? { id: { lt: opts.cursor } } : {}),
    };
    return prisma.article.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: opts.limit + 1,
      include: {
        author: { select: { name: true, username: true } },
      },
    });
  },

  findPublishedTags() {
    return prisma.article
      .findMany({
        where: {
          status: ArticleStatus.PUBLISHED,
          isListed: true,
          articleType: { in: ["STOCK_ANALYSIS", "NEWS", "GENERAL"] },
        },
        select: { tags: true },
      })
      .then((rows) => [...new Set(rows.flatMap((r) => r.tags))].sort());
  },

  findBySlug(slug: string) {
    return prisma.article.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, username: true, name: true, image: true } },
      },
    });
  },

  findPrevNext(articleId: string, publishedAt: Date, articleType?: ArticleType) {
    const typeFilter = articleType ? { articleType } : {};
    return Promise.all([
      prisma.article.findFirst({
        where: { status: ArticleStatus.PUBLISHED, ...typeFilter, publishedAt: { lt: publishedAt } },
        orderBy: { publishedAt: "desc" },
        select: { slug: true, title: true },
      }),
      prisma.article.findFirst({
        where: { status: ArticleStatus.PUBLISHED, ...typeFilter, publishedAt: { gt: publishedAt } },
        orderBy: { publishedAt: "asc" },
        select: { slug: true, title: true },
      }),
    ]);
  },

  findAllForAdmin(opts?: { status?: ArticleStatus; type?: ArticleType }) {
    return prisma.article.findMany({
      where: {
        ...(opts?.status ? { status: opts.status } : {}),
        ...(opts?.type ? { articleType: opts.type } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, username: true, name: true, image: true } },
      },
    });
  },

  findById(id: string) {
    return prisma.article.findUnique({ where: { id } });
  },

  async create(data: {
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    authorId: string;
    tags: string[];
    status: ArticleStatus;
    articleType: ArticleType;
    aiProvider?: string;
    tickerTag?: string;
    generationMeta?: Prisma.InputJsonValue;
    isListed?: boolean;
  }) {
    return prisma.article.create({ data });
  },

  update(id: string, data: Prisma.ArticleUpdateInput) {
    return prisma.article.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.article.delete({ where: { id } });
  },

  async getStats() {
    const [total, published, drafts, stockAnalysis, educational, news, general] = await Promise.all([
      prisma.article.count(),
      prisma.article.count({ where: { status: ArticleStatus.PUBLISHED } }),
      prisma.article.count({ where: { status: ArticleStatus.DRAFT } }),
      prisma.article.count({ where: { articleType: ArticleType.STOCK_ANALYSIS } }),
      prisma.article.count({ where: { articleType: ArticleType.EDUCATIONAL } }),
      prisma.article.count({ where: { articleType: ArticleType.NEWS } }),
      prisma.article.count({ where: { articleType: ArticleType.GENERAL } }),
    ]);
    return { total, published, drafts, stockAnalysis, educational, news, general };
  },

  findRecentStockAnalysisSlugs() {
    return prisma.article
      .findMany({
        where: { articleType: ArticleType.STOCK_ANALYSIS, tickerTag: { not: null } },
        orderBy: { createdAt: "desc" },
        select: { slug: true, tickerTag: true, createdAt: true },
      })
      .then((rows) => {
        const map = new Map<string, Date>();
        for (const r of rows) {
          if (r.tickerTag && !map.has(r.tickerTag)) {
            map.set(r.tickerTag, r.createdAt);
          }
        }
        return map;
      });
  },

  findExistingEducationalSlugs() {
    return prisma.article
      .findMany({
        where: { articleType: ArticleType.EDUCATIONAL },
        select: { slug: true },
      })
      .then((rows) => new Set(rows.map((r) => r.slug)));
  },

  findAdminUserId() {
    return prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    });
  },

  incrementVersion(id: string) {
    return prisma.article.update({
      where: { id },
      data: { version: { increment: 1 }, lastGeneratedAt: new Date() },
    });
  },

  async findTickersNeedingGeneration(batchSize: number, allTickers: string[]): Promise<string[]> {
    const existing = await prisma.article.findMany({
      where: { articleType: ArticleType.STOCK_ANALYSIS, tickerTag: { not: null } },
      select: { tickerTag: true, lastGeneratedAt: true },
    });

    const articleMap = new Map<string, Date>();
    for (const a of existing) {
      if (a.tickerTag) {
        const prev = articleMap.get(a.tickerTag);
        if (!prev || a.lastGeneratedAt > prev) {
          articleMap.set(a.tickerTag, a.lastGeneratedAt);
        }
      }
    }

    const neverGenerated = allTickers.filter((t) => !articleMap.has(t));
    const needsUpdate = allTickers
      .filter((t) => articleMap.has(t))
      .sort((a, b) => articleMap.get(a)!.getTime() - articleMap.get(b)!.getTime());

    return [...neverGenerated, ...needsUpdate].slice(0, batchSize);
  },

  async deleteOldSnapshots() {
    // Delete all DAILY_SNAPSHOT articles created BEFORE today (keep only today's)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const oldSnapshots = await prisma.article.findMany({
      where: {
        articleType: "DAILY_SNAPSHOT",
        createdAt: { lt: startOfToday },
      },
      select: { id: true },
    });

    const ids = oldSnapshots.map((a) => a.id);
    if (ids.length === 0) return { deletedCount: 0 };

    await prisma.article.deleteMany({
      where: { id: { in: ids } },
    });

    return { deletedCount: ids.length };
  },
};
