import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, lt, or } from "darizd";
import { db } from "@/db";
import { tlsStellarTxRecords } from "@/db/schema";
import { verifyAdminKey } from "@/lib/admin-auth";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const VALID_STATUSES = [
  "pending",
  "confirmed",
  "failed",
  "not_found",
  "error",
] as const;

type ValidStatus = (typeof VALID_STATUSES)[number];

export type RecordsResponse = {
  records: Array<{
    id: string;
    txHashTruncated: string;
    sourceType: string;
    sourceId: string;
    finalityStatus: string;
    pollCount: number;
    lastError: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  nextCursor: string | null;
};

function truncateTxHash(hash: string | null | undefined): string {
  if (!hash) return "";
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

function parseLimit(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

function encodeCursor(updatedAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ u: updatedAt.toISOString(), i })).toString("base64url");
}

function decodeCursor(raw: string): { updatedAt: Date; id: string } | null {
  try {
    const json = JSON.parse(Buffer.from(raw, "base64url").toString("utf-8")) as {
      u?: unknown;
      i?: unknown;
    };
    if (typeof json.u !== "string" || typeof json.i !== "string") {
      return null;
    }
    const updatedAt = new Date(json.u);
    if (Number.isNaN(updatedAt.getTime())) return null;
    return { updatedAt, id: json.i };
  } catch {
    return null;
  }
}

function isValidStatus(value: string): value is ValidStatus {
  return (VALID_STATUSES as readonly string[]).includes(value);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await verifyAdminKey(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const cursorParam = url.searchParams.get("cursor");
  const limit = parseLimit(url.searchParams.get("limit"));

  if (statusParam && !isValidStatus(statusParam)) {
    return NextResponse.json(
      { error: "invalid status", allowed: VALID_STATUSES },
      { status: 400 },
    );
  }

  const conditions = [];
  if (statusParam) {
    conditions.push(eq(tlsStellarTxRecords.finalityStatus, statusParam));
  }

  if (cursorParam) {
    const cursor = decodeCursor(cursorParam);
    if (!cursor) {
      return NextResponse.json({ error: "invalid cursor" }, { status: 400 });
    }
    // Keyset pagination on (updatedAt DESC, id DESC).
    conditions.push(
      or(
        lt(tlsStellarTxRecords.updatedAt, cursor.updatedAt),
        and(
          eq(tlsStellarTxRecords.updatedAt, cursor.updatedAt),
          lt(tlsStellarTxRecords.id, cursor.id),
        ),
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: tlsStellarTxRecords.id,
      txHash: tlsStellarTxRecords.txHash,
      sourceType: tlsStellarTxRecords.sourceType,
      sourceId: tlsStellarTxRecords.sourceId,
      finalityStatus: tlsStellarTxRecords.finalityStatus,
      pollCount: tlsStellarTxRecords.pollCount,
      lastError: tlsStellarTxRecords.lastError,
      createdAt: tlsStellarTxRecords.createdAt,
      updatedAt: tlsStellarTxRecords.updatedAt,
    })
    .from(tlsStellarTxRecords)
    .where(where)
    .orderBy(desc(tlsStellarTxRecords.updatedAt), desc(tlsStellarTxRecords.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor(last.updatedAt, last.id) : null;

  const response: RecordsResponse = {
    records: page.map((r) => ({
      id: r.id,
      txHashTruncated: truncateTxHash(r.txHash),
      sourceType: r.sourceType,
      sourceId: r.sourceId,
      finalityStatus: r.finalityStatus,
      pollCount: r.pollCount,
      lastError: r.lastError,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    nextCursor,
  };

  return NextResponse.json(response, {
    status: 200,
    headers: { "cache-control": "no-store" },
  });
}
