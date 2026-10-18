export type ReconcilerStatus = "pending" | "confirmed" | "failed" | "unknown";

export interface RecordViewInput {
  txHash?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  finalityStatus?: string | null;
  pollCount?: number | null;
  lastError?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

export interface RecordViewRow {
  txHashTruncated: string;
  sourceType: string;
  sourceId: string;
  status: ReconcilerStatus;
  statusLabel: string;
  pollCount: number;
  lastError: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ReconcilerStatsInput {
  total?: number;
  pending?: number;
  confirmed?: number;
  failed?: number;
  lastTickAt?: string | Date | null;
  lastTickDurationMs?: number | null;
  enabled?: boolean;
}

export interface StatsView {
  total: number;
  pending: number;
  confirmed: number;
  failed: number;
  healthy: boolean;
  healthLabel: string;
  lastTickAt: string | null;
  lastTickDurationMs: number | null;
  enabled: boolean;
}

export interface TickSummaryInput {
  processed?: number;
  confirmed?: number;
  failed?: number;
  skipped?: number;
  durationMs?: number;
  error?: string | null;
}

export interface TickSummaryView {
  ok: boolean;
  partial: boolean;
  processed: number;
  confirmed: number;
  failed: number;
  skipped: number;
  durationMs: number | null;
  error: string | null;
  message: string;
}

const VALID_STATUES: readonly ReconcilerStatus[] = ["pending", "confirmed", "failed", "unknown"];

function isValidStatus(status: unknown): status is ReconcilerStatus {
  return typeof status === "string" && (VALID_STATUSES as readonly string[]).includes(status);
}

function normalizeStatus(status: unknown): ReconcilerStatus {
  return isValidStatus(status) ? status : "unknown";
}

function statusLabel(status: ReconcilerStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "confirmed":
      return "Confirmed";
    case "failed":
      return "Failed";
    default:
      return "Unknown";
  }
}

function toIsoString(value: string | Date | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return value;
}

function toSafeInteger(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.trunc(value));
}

/**
 * Truncates a transaction hash for display. Never returns the full hash.
 */
export function truncateTxHash(hash: string | null | undefined): string {
  if (!hash) {
    return "—";
  }
  const trimmed = hash.trim();
  if (trimmed.length <= 16) {
    return trimmed;
  }
  return `${trimmed.slice(0, 8)}…~${trimmed.slice(-8)}`;
}

export function toRecordViewRow(record: RecordViewInput): RecordViewRow {
  const status = normalizeStatus(record.finalityStatus);
  return {
    txHashTruncated: truncateTxHash(record.txHash),
    sourceType: record.sourceType ?? "—",
    sourceId: record.sourceId ?? "—",
    status,
    statusLabel: statusLabel(status),
    pollCount: toSafeInteger(record.pollCount),
    lastError: record.lastError ?? null,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

export function toRecordViewRows(records: RecordViewInput[]): RecordViewRow[] {
  if (!Array.isArray(records)) {
    return [];
  }
  return records.map(toRecordViewRow);
}

export function toStatsView(stats: ReconcilerStatsInput | null | undefined): StatsView {
  const safe = stats ?? {};
  const pending = toSafeInteger(safe.pending);
  const confirmed = toSafeInteger(safe.confirmed);
  const failed = toSafeInteger(safe.failed);
  const total = toSafeInteger(safe.total) || pending + confirmed + failed;
  const enabled = safe.enabled !== false;
  const healthy = enabled && failed === 0;
  return {
    total,
    pending,
    confirmed,
    failed,
    healthy,
    healthLabel: !enabled ? "Disabled" : healthy ? "Healthy" : "Degraded",
    lastTickAt: toIsoString(safe.lastTickAt),
    lastTickDurationMs:
      typeof safe.lastTickDurationMs === "number" && Number.isFinite(safe.lastTickDurationMs)
        ? Math.max(0, safe.lastTickDurationMs)
        : null,
    enabled,
  };
}

export function toTickSummaryView(
  summary: TickSummaryInput | null | undefined,
  options: { ok?: boolean; partial?: boolean } = {},
): TickSummaryView {
  const safe = summary ?? {};
  const ok = options.ok === true;
  const error = safe.error ?? null;
  const partial = options.partial === true || !ok || error !== null;
  const processed = toSafeInteger(safe.processed);
  const confirmed = toSafeInteger(safe.confirmed);
  const failed = toSafeInteger(safe.failed);
  const skipped = toSafeInteger(safe.skipped);
  const durationMs =
    typeof safe.durationMs === "number" && Number.isFinite(safe.durationMs)
      ? Math.max(0, safe.durationMs)
      : null;

  let message: string;
  if (partial) {
    message = error
      ? `Tick partially completed: ${error} (processed ${processed}, confirmed ${confirmed}, failed ${failed})`
      : `Tick partially completed (processed ${processed}, confirmed ${confirmed}, failed ${failed})`;
  } else {
    message = `Tick completed (processed ${processed}, confirmed ${confirmed}, failed ${failed})`;
  }

  return {
    ok,
    partial,
    processed,
    confirmed,
    failed,
    skipped,
    durationMs,
    error,
    message,
  };
}

export function isValidStatusFilter(value: unknown): value is ReconcilerStatus {
  return isValidStatus(value);
}
