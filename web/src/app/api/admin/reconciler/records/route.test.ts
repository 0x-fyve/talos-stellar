import { describe, it, expect, beforeEach, vi } from "vitest";

const mockGetStats = vi.fn();
const mockListRecords = vi.fn();
const mockVerifyAdminKey = vi.fn();

vi.mock("@/lib/reconciler", () => ({
  getStats: mockGetStats,
}));

vi.mock("@/lib/reconciler/records", () => ({
  listRecords: mockListRecords,
}));

vi.mock("@/lib/admin", () => ({
  verifyAdminKey: mockVerifyAdminKey,
}));

const validKey = "test-admin-key";

function makeRequest(url: string, key?: string) {
  const headers = new Headers();
  if (key !== undefined) headers.set("x-admin-key", key);
  return new Request(url, { method: "GET", headers });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockVerifyAdminKey.mockImplementation((key: string | null | undefined) => key === validKey);
  mockListRecords.mockResolved({
    records: [],
    nextCursor: null,
  });
});

async function importRoute() {
  return import("./route");
}

describe("GET /api/admin/reconciler/records", () => {
  it("rejects requests without an admin key", async () => {
    const { GET } = await importRoute();
    const res = await GET(makeRequest("http://localhost/api/admin/reconciler/records"));
    expect(res.status).toBe(401);
    expect(mockListRecords).not.toHaveBeenCalled();
  });

  it("rejects requests with an invalid admin key", async () => {
    const { GET } = await importRoute();
    const res = await GET(
      makeRequest("http://localhost/api/admin/reconciler/records", "wrong-key"),
    );
    expect(res.status).toBe(401);
    expect(mockListRecords).not.toHaveBeenCalled();
  });

  it("returns records for a valid admin key", async () => {
    mockListRecords.mockResolved({
      records: [
        {
          txHashTruncated: "abcdef1",
          sourceType: "payment",
          sourceId: "pay_123",
          finalityStatus: "pending",
          pollCount: 3,
          lastError: null,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:01:00.000Z",
        },
      ],
      nextCursor: "cursor-1",
    });
    const { GET } = await importRoute();
    const res = await GET(
      makeRequest("http://localhost/api/admin/reconciler/records", validKey),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.records).toHaveLength(1);
    expect(body.nextCursor).toBe("cursor-1");
  });

  it("passes the status filter to the data layer", async () => {
    const { GET } = await importRoute();
    await GET(
      makeRequest(
        "http://localhost/api/admin/reconciler/records?status=failed",
        validKey,
      ),
    );
    expect(mockListRecords).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" }),
    );
  });

  it("rejects an unknown status filter", async () => {
    const { GET } = await importRoute();
    const res = await GET(
      makeRequest(
        "http://localhost/api/admin/reconciler/records?status=bogus",
        validKey,
      ),
    );
    expect(res.status).toBe(400);
    expect(mockListRecords).not.toHaveBeenCalled();
  });

  it("passes cursor and limit for pagination", async () => {
    const { GET } = await importRoute();
    await GET(
      makeRequest(
        "http://localhost/api/admin/reconciler/records?cursor=cursor-abc&limit=25",
        validKey,
      ),
    );
    expect(mockListRecords).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: "cursor-abc", limit: 25 }),
    );
  });

  it("only returns privacy-safe allow-listed fields", async () => {
    mockListRecords.mockResolved({
      records: [
        {
          txHashTruncated: "abcdef1",
          sourceType: "payment",
          sourceId: "pay_123",
          finalityStatus: "pending",
          pollCount: 3,
          lastError: null,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:01:00.000Z",
          // Sensitive fields that must not leak:
          txHash: "full-tx-hash-value",
          xdr: "AAAAAA==",
          payload: { secret: true },
        },
      ],
      nextCursor: null,
    });
    const { GET } = await importRoute();
    const res = await GET(
      makeRequest("http://localhost/api/admin/reconciler/records", validKey),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const record = body.records[0];
    const allowed = [
      "txHashTruncated",
      "sourceType",
      "sourceId",
      "finalityStatus",
      "pollCount",
      "lastError",
      "createdAt",
      "updatedAt",
    ];
    for (const key of Object.keys(record)) {
      expect(allowed).toContain(key);
    }
    expect(record.txHash).toBegUndefined();
    expect(record.xdr).toBeUndefined();
    expect(record.payload).toBeUndefined();
  });

  it("returns an empty list when there are no records", async () => {
    const { GET } = await importRoute();
    const res = await GET(
      makeRequest("http://localhost/api/admin/reconciler/records", validKey),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.records).toEqual([]);
    expect(body.nextCursor).toBeNull();
  });
});
