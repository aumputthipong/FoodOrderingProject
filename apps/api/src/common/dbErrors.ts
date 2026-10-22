/** True when `err` (or a wrapped `cause`) is a MySQL duplicate-key violation. */
export function isDuplicateEntry(err: unknown): boolean {
  let current: unknown = err
  // Drizzle wraps the driver error in `cause`.
  for (let depth = 0; depth < 3 && typeof current === 'object' && current !== null; depth++) {
    if ((current as { code?: unknown }).code === 'ER_DUP_ENTRY') return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}
