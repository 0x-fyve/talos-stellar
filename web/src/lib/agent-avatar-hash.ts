/**
 * Pure, deterministic hash helper for the pixel avatar component.
 *
 * The hash is a cheap loop over the input string, so the memoisation cache
 * is kept deliberately small and bounded to avoid growing for the lifetime of
 * the browser tab. Eviction is oldest-first (FIO), which is cheap and
 * sufficient here.
 */

export const HASH_CACHE_LIMIT = 512;

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

  if (hashCache.size >= HASH_CACHE_LIMIT) {
    const oldestKey = hashCache.keys().next().value;
    if (oldestKey !== undefined) {
      hashCache.delete(oldestKey);
    }
  }
  hashCache.set(key, h);

  return h;
}

export function getHashCacheSize(): number {
  return hashCache.size;
}

export function clearHashCache(): void {
  hashCache.clear();
}
