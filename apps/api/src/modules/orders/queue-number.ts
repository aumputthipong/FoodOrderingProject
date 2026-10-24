// The canteen runs on Bangkok time (UTC+7, no DST), so queue numbers restart at local midnight.
const QUEUE_UTC_OFFSET_MS = 7 * 60 * 60 * 1000

/** The canteen day (`YYYY-MM-DD`) an order placed at `at` belongs to. */
export function queueDateOf(at: Date): string {
  return new Date(at.getTime() + QUEUE_UTC_OFFSET_MS).toISOString().slice(0, 10)
}
