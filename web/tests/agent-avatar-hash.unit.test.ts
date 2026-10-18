import { describe, it, expect, beforeEach } from "vitest";
import {
  hash,
  HASH_CACHE_MAX,
  __getHashCacheSize,
  __clearHashCache,
} from "@/lib/agent-avatar-hash";

describe("agent-avatar hash", () => {
  beforeEach(() => {
    __clearHashCache();
  });

  it("is deterministic for fixed names", () => {
    const fixed: Array<[string, number]> = [
      ["alice", 0],
      ["alice", 0],
      ["bob", 1],
      ["codalot", 7],
      ["", 0],
      ["agent-name-with-spaces", 3],
    ];
    for (const [name, seed] of fixed) {
      expect(hash(name, seed)).toBe(hash(name, seed));
    }
  });

  it("produces the same value before and after caching", () => {
    const first = hash("zed", 5);
    const second = hash("zed", 5);
    expect(second).toBe(first);
  });

  it("never exceeds the cache cap", () => {
    for (let i = 0; i < HASH_CACHE_MAX * 4; i++) {
      hash(`name-${i}`, i % 16);
    }
    expect(__getHashCacheSize()).toBeLessThanOrEqual(HASH_CACHE_MAX);
  });

  it("recomputes evicted keys to the same value", () => {
    const name = "evicted-name";
    const seed = 42;
    const original = hash(name, seed);

    // Flood the cache so the original entry is evicted.
    for (let i = 0; i < HASH_CACHE_MAX + 10; i++) {
      hash(`flood-${i}`, i);
    }

    expect(hash(name, seed)).toBe(original);
  });
});
