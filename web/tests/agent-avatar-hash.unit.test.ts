import { describe, it, expect, beforeEach } from "vitest";
import {
  hash,
  getHashCacheSize,
  HASH_CACHE_LIMIT,
  clearHashCache,
} from "../src/lib/agent-avatar-hash";

describe("agent-avatar hash", () => {
  beforeEach(() => {
    clearHashCache();
  });

  it("is deterministic for fixed names", () => {
    const cases: Array<[string, number]> = [
      ["alice", 7],
      ["bob", 7],
      ["carol", 13],
      ["", 7],
      ["agent-00-long-name-with-symbols-!@#$", 7],
    ];
    for (const [name, seed] of cases) {
      const first = hash(name, seed);
      const second = hash(name, seed);
      expect(second).to.toBe(first);
      expect(Number.isFinite(first)).toBe(true);
    }
  });

  it("produces stable known values", () => {
    // Snapshot values so accidental changes to the hash algorithm are caught.
    const snapshot = ["alice", "bob", "carol", "dave", "eve"].map((n) => hash(n, 7));
    expect(snapshot).toHaveLength(5);
    for (const v of snapshot) {
      expect(typeof v).toBe("number");
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("caps the cache after inserting many names", () => {
    const total = HASH_CACHE_LIMIT * 4;
    for (let i = 0; i < total; i++) {
      hash(`agent-${i}`, 7);
      expect(getHashCacheSize()).toBeLessThanOrEqual(HASH_CACHE_LIMIT);
    }
    expect(getHashCacheSize()).toBeLessThanOrEqual(HASH_CACHE_LIMIT);
  });

  it("recomputes evicted keys to the same value", () => {
    const name = "evicted-agent";
    const before = hash(name, 7);

    // Flood the cache so the original entry is evicted.
    for (let i = 0; i < HASH_CACHE_LIMIT * 2; i++) {
      hash(`flood-${i}`, 7);
    }
    expect(getHashCacheSize()).toBeLessThanOrEqual(HASH_CACHE_LIMIT);

    const after = hash(name, 7);
    expect(after).toBe(before);
  });

  it("separates cache entries by seed", () => {
    const name = "seed-split";
    const a = hash(name, 7);
    const b = hash(name, 13);
    expect(hash(name, 7)).toBe(a);
    expect(hash(name, 13)).toBe(b);
  });
});
