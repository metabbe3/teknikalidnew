import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import { remarkCallouts } from "@/lib/remark-callouts";

export function extractHeadings(content: string): { id: string; text: string }[] {
  const headings: { id: string; text: string }[] = [];
  const regex = /^## (.+)$/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const text = match[1].trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    headings.push({ id, text });
  }
  return headings;
}

export function estimateReadingTime(content: string): number {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function ArticleContent({ content }: { content: string }) {
  return (
    <article className="article-prose">
      <Markdown
        remarkPlugins={[remarkGfm, remarkDirective, remarkCallouts]}
        rehypePlugins={[rehypeRaw, rehypeSlug]}
      >
        {content}
      </Markdown>
    </article>
  );
}
