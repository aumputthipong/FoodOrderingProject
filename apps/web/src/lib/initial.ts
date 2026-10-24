/** First character of a name, uppercased for Latin letters (Thai is unaffected). */
export function nameInitial(name: string | undefined): string {
  return Array.from(name ?? '')[0]?.toUpperCase() ?? ''
}
