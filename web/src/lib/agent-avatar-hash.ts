/**
 * Pure hash helper for the pixel avatar component.
 *
 * The hash is a cheap loop over the input string, so the memoisation cache is capped to a small size with oldest-first (FIFO) eviction. This prevents the cache from growing unbounded for the lifetime of the browser tab.
 */

export const HASH_CACHE_MAX = 512;

const hashCache = new Map<string, number>();

export function hash(str: string, seed: number): number {
  const key = `${seed}:${str}`;
  const cached = hashCache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  let h = seed | 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }

  if (hashCache.size >= HASH_CACHE_MAX) {
    const oldestKey = hashCache.keys().next().value;
    if (oldestKey !== undefined) {
      hashCache.delete(oldestKey);
    }
  }

  hashCache.set(key, h);
  return h;
}

export function clearHashCache(): void {
  hashCache.clear();
}

export function getHashCacheSize(): number {
  return hashCache.size;
}
