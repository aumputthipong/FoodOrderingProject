/** True when `err` or one of its wrapped `cause`s carries the MySQL error `code`. */
function hasMysqlCode(err: unknown, code: string): boolean {
  let current: unknown = err
  // Drizzle wraps the driver error in `cause`.
  for (let depth = 0; depth < 3 && typeof current === 'object' && current !== null; depth++) {
    if ((current as { code?: unknown }).code === code) return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}

/** True when `err` (or a wrapped `cause`) is a MySQL duplicate-key violation. */
export function isDuplicateEntry(err: unknown): boolean {
  return hasMysqlCode(err, 'ER_DUP_ENTRY')
}

/**
 * True when `err` (or a wrapped `cause`) is an InnoDB deadlock (errno 1213). InnoDB has already
 * rolled the whole transaction back, so it is safe to run it again from the start.
 */
export function isDeadlock(err: unknown): boolean {
  return hasMysqlCode(err, 'ER_LOCK_DEADLOCK')
}
