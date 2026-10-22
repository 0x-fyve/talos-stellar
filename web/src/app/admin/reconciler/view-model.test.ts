import { describe, it, expect } from "vitest";

import {
  buildReconcilerViewModel,
  formatTimestamp,
  formatTimeSpan,
  statusLabel,
  truncateHash,
  type ReconcilerRecord,
  type ReconcilerStats,
  type TickResult,
} from "./view-model";

function makeRecord(overrides: Partial<ReconcilerRecord> = {}): ReconcilerRecord {
  return {
    id: "rec_1",
    txHashTruncated: "abcdef0123...456789abc",
    sourceType: "invoice",
    sourceId: "inv_123",
    finalityStatus: "pending",
    pollCount: 3,
    lastError: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:05:00Z",
    ...overrides,
  };
}

function makeStats(overrides: Partial<ReconcilerStats> = {}): ReconcilerStats {
  return {
    enabled: true,
    lastTickAt: "2024-01-01T00:00:00Z",
    lastTickDurationMs: 120,
    pendingCount: 2,
    confirmedCount: 10,
    failedCount: 1,
    lastError: null,
    ...overrides,
  };
}

describe("truncateHash", () => {
  it("returns an empty string for null/empty input", () => {
    expect(truncateHash(null)).toBe("");
    expect(truncateHash(undefined)).toBe("");
    expect(truncateHash("")).toBe("");
  });

  it("leaves short hashes untouched", () => {
    expect(truncateHash("abcdef")).toBe("abcdef");
  });

  it("preserves a short prefix and suffix for long hashes", () => {
    const hash = "a".repeat(64);
    const result = truncateHash(hash);
    expect(result).toContain("...");
    expect(result.length).toBeLessThan(hash.length);
    expect(result.startsWith(hash.slice(0, 8))).toBe(true);
    expect(result.endsWith(hash.slice(-8))).toBe(true);
  });

  it("never returns the full hash for long input", () => {
    const hash = "b".repeat(64);
    expect(truncateHash(hash)).not.toBe(hash);
  });
});

describe("statusLabel", () => {
  it("maps known statuses", () => {
    expect(statusLabel("pending")).toBe("Pending");
    expect(statusLabel("confirmed")).toBe("Confirmed");
    expect(statusLabel("failed")).toBe("Failed");
  });

  it("falls back to the raw status for unknown values", () => {
    expect(statusLabel("weird")).toBe("weird");
  });
});

describe("formatTimestamp", () => {
  it("returns a placeholder for missing values", () => {
    expect(formatTimestamp(null)).toBe("—");
    expect(formatTimestamp(undefined)).toBe("—");
  });

  it("returns a placeholder for invalid dates", () => {
    expect(formatTimestamp("not-a-date")).toBe("—");
  });

  it("returns a non-empty string for valid dates", () => {
    const result = formatTimestamp("2024-01-01T00:00:00Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("formatTimeSpan", () => {
  it("returns a placeholder for missing values", () => {
    expect(formatTimeSpan(null)).toBe("—");
    expect(formatTimeSpan(undefined)).toBe("—");
  });

  it("returns a placeholder for invalid dates", () => {
    expect(formatTimeSpan("not-a-date")).toBe("—");
  });

  it("renders a human-readable span", () => {
    const result = formatTimeSpan("2024-01-01T00:00:00Z", "2024-01-01T00:05:30Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
describe("buildReconcilerViewModel", () => {
  it("handles empty data", () => {
    const vm = buildReconcilerViewModel({
      stats: null,
      records: [],
      tickResult: null,
    });

    expect(vm.hasStats).toBe(false);
    expect(vm.rows).toHaveLength(0);
    expect(vm.emptyMessage).toBe("No records for this filter.");
    expect(vm.tickSummary).toBe(null);
  });

  it("builds stats cards when stats are present", () => {
    const vm = buildReconcilerViewModel({
      stats: makeStats(),
      records: [],
      tickResult: null,
    });

    expect(vm.hasStats).toBe(true);
  });
});
