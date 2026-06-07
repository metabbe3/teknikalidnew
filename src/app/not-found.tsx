import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center">
      <div className="bg-bg-card depth-shadow rounded-xl p-8 max-w-md mx-auto space-y-4">
        <p className="text-6xl font-bold text-accent" aria-hidden="true">404</p>
        <h1 className="text-xl font-semibold">Halaman Tidak Ditemukan</h1>
        <p className="text-text-secondary text-sm">
          Saham atau halaman yang kamu cari tidak tersedia di TeknikalID.
        </p>
        <form action="/stocks" method="get" className="pt-1">
          <div className="flex rounded-full border border-border overflow-hidden bg-bg-primary">
            <input
              type="text"
              name="q"
              placeholder="Cari saham..."
              className="flex-1 px-4 py-2 text-sm bg-transparent outline-none placeholder:text-text-secondary"
            />
            <button
              type="submit"
              className="px-4 text-sm font-medium text-white bg-accent hover:opacity-90 transition-opacity"
              aria-label="Cari saham"
            >
              Cari
            </button>
          </div>
        </form>
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex gap-3 justify-center">
            <Link
              href="/"
              className="bg-text-primary text-white px-5 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity press-scale"
            >
              Beranda
            </Link>
            <Link
              href="/stocks"
              className="bg-bg-card text-text-primary px-5 py-2 rounded-full text-sm font-medium hover:bg-bg-hover transition-colors press-scale border border-border"
            >
              Daftar Saham
            </Link>
          </div>
          <div className="flex gap-3 justify-center">
            <Link
              href="/screener"
              className="text-accent text-sm font-medium hover:underline"
            >
              Screener
            </Link>
            <Link
              href="/berita"
              className="text-accent text-sm font-medium hover:underline"
            >
              Berita
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
