import Link from "next/link";

/** Anchor "radar saham IDX" — internal link from every berita article to /stocks. */
export default function RadarCtaLink() {
  return (
    <p className="mt-6 text-sm text-text-secondary">
      📊 Pantau pergerakan pasar real-time di{" "}
      <Link href="/stocks" className="text-accent font-semibold hover:underline">
        radar saham IDX
      </Link>{" "}
      — harga live, sinyal golden cross, dan screener gratis.
    </p>
  );
}
