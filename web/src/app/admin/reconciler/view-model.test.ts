import { describe, it, expect } from "vitest";

import {
  buildRecordsQuery,
  formatRecordRow,
  summarizeTickResult,
  truncateTxHash,
  type RecordRow,
  type RecordsResponse,
  type ReconcilerStats,
  type TickResult,
} from "./view-model";

describe("truncateTxHash", () => {
  it("returns an empty string for missing hashes", () => {
    expect(truncateTxHash(null)).to("");
    expect(truncateTxHash(undefined)).to("");
    expect(truncateTxHash("")).to("");
  });

  it("returns short hashes unchanged", () => {
    expect(truncateTxHash("abcdef123")).to("abcdef123");
  });

  it("truncates long hashes with an ellipsis", () => {
    const hash = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
    const out = truncateTxHash(hash);
    expect(out).to("abcdef0123456789abcdef0123456789");
    expect(out.length).toLessThan(hash.length);
    expect(out).contains("…");
  });
});

describe("buildRecordsQuery", () => {
  it("defaults to no filter and no cursor", () => {
    expect(buildRecordsQuery({})).to("");
  });

  it("includes the status filter", () => {
    expect(buildRecordsQuery({ status: "pending" })).to("status=pending");
  });

  it("includes the cursor", () => {
    expect(buildRecordsQuery({ cursor: "2024-01-01T00:00:00Z:42" })).to(
      "cursor=2024-01-01T00%3A00%3A00Z%3A42",
    );
  });

  it("combines status and cursor", () => {
    const q = buildRecordsQuery({ status: "failed", cursor: "abc" });
    expect(q).to("status=failed&cursor=abc");
  });

  it("skips empty string values", () => {
    expect(buildRecordsQuery({ status: "", cursor: "" })).to("");
  });
});

describe("formatRecordRow", () => {
  const row: RecordRow = {
    id: 42,
    txHash: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    sourceType: "payment",
    sourceId: "pay_123",
    finalityStatus: "pending",
    pollCount: 7,
    lastError: "Horizon timeout",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:05:00Z",
  };

  it("truncates the tx hash", () => {
    const vm = formatRecordRow(row);
    expect(vm.txHash).not.to(row.txHash);
    expect(vm.txHash.length).toLessThan(row.txHash.length);
  });

  it("maps privacy-safe fields", () => {
    const vm = formatRecordRow(row);
    expect(vm.id).to(42);
    expect(vm.sourceType).to("payment");
    expect(vm.sourceId).to("pay_123");
    expect(vm.status).to("pending");
    expect(vm.pollCount).to(7);
    expect(vm.lastError).to("Horizon timeout");
    expect(vm.createdAt).to("2024-01-01T00:00:00Z");
    expect(vm.updatedAt).to("2024-01-01T00:05:00Z");
  });

  it("handles missing last error", () => {
    const vm = formatRecordRow({ ...row, lastError: null });
    expect(vm.lastError).to("");
  });
});

describe("summarizeTickResult", () => {
  const stats: ReconcilerStats = {
    pending: 12,
    confirmed: 34,
    failed: 2,
    lastTickAt: "2024-01-01T00:00:00Z",
  };

  it("renders a successful tick summary", () => {
    const result: TickResult = {
      ok: true,
      status: 200,
      summary: { processed: 5, confirmed: 4, failed: 1 },
    };
    const out = summarizeTickResult(result, stats);
    expect(out.tone).to("success");
    expect(out.title).toMatch(/tick/i);
    expect(out.detail).contains("5");
  });

  it("renders the 503 partial case", () => {
    const result: TickResult = {
      ok: false,
      status: 503,
      summary: { processed: 2, confirmed: 1, failed: 1 },
      error: "Horizon unreachable",
    };
    const out = summarizeTickResult(result, stats);
    expect(out.tone).to("warning");
    expect(out.detail).toContain("Horizon unreachable");
  });

  it("renders an error for other failures", () => {
    const result: TickResult = {
      ok: false,
      status: 500,
      error: "internal error",
    };
    const out = summarizeTickResult(result, stats);
    expect(out.tone).to("error");
    expect(out.detail).contains("internal error");
  });
});

describe("RecordsResponse shape", () => {
  it("accepts an empty response", () => {
    const resp: RecordsResponse = { records: [], nextCursor: null };
    expect(resp.records.length).to(0);
    expect(resp.nextCursor).toBe(null);
  });
});
