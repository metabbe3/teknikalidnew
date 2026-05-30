class TtlCache<T> {
  private store = new Map<string, { data: T; expires: number }>();

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
    this.store.set(key, { data, expires: Date.now() + ttlMs });
  }

  invalidate(prefix: string) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

export const stockCache = new TtlCache<unknown>();
