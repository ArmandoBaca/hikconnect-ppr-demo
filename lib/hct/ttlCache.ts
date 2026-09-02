const TTL_MS = 4 * 60 * 1000;

interface Entry<T> {
  at: number;
  value: T;
}

export function createTtlCache<T>() {
  const map = new Map<string, Entry<T>>();
  return {
    get(key: string): T | undefined {
      const hit = map.get(key);
      if (!hit) return undefined;
      if (Date.now() > hit.at + TTL_MS) {
        map.delete(key);
        return undefined;
      }
      return hit.value;
    },
    set(key: string, value: T) {
      map.set(key, { at: Date.now(), value });
    },
    delete(key: string) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
  };
}
