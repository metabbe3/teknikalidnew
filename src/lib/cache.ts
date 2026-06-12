export class TtlCache<T> {
  private store = new Map<string, { data: T; expires: number }>();
  private maxSize: number;

  constructor(maxSize = 200) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs: number) {
    this.evictIfNeeded();
    this.store.set(key, { data, expires: Date.now() + ttlMs });
  }

  invalidate(prefix: string) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  get size() {
    return this.store.size;
  }

  private evictIfNeeded() {
    if (this.store.size < this.maxSize) return;
    const now = Date.now();
    for (const [k, v] of this.store) {
      if (v.expires <= now) this.store.delete(k);
    }
    if (this.store.size >= this.maxSize) {
      const oldest = [...this.store.entries()]
        .sort((a, b) => a[1].expires - b[1].expires)[0];
      if (oldest) this.store.delete(oldest[0]);
    }
  }
}

export const stockCache = new TtlCache<unknown>();
