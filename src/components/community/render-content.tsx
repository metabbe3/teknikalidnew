import Link from "next/link";

const TICKER_RE = /\$([A-Z]{2,4}\.JK)/g;
const MENTION_RE = /@([a-zA-Z0-9_]{3,20})/g;

export function renderContent(content: string) {
  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;

  // Combine both patterns
  const combined = new RegExp(
    `(\\$[A-Z]{2,4}\\.JK)|(@[a-zA-Z0-9_]{3,20})`,
    "g"
  );

  let match;
  while ((match = combined.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    const text = match[0];

    if (text.startsWith("$")) {
      const ticker = text.slice(1);
      parts.push(
        <Link
          key={`t-${match.index}`}
          href={`/stocks/${ticker}`}
          className="text-accent hover:underline font-bold tracking-tight"
          onClick={(e) => e.stopPropagation()}
        >
          {text}
        </Link>
      );
    } else if (text.startsWith("@")) {
      const username = text.slice(1);
      parts.push(
        <Link
          key={`m-${match.index}`}
          href={`/profile/${username}`}
          className="text-accent hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {text}
        </Link>
      );
    }

    lastIndex = match.index + text.length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
}
