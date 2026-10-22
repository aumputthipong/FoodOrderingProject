export function toImageUrl(filename: string | null): string | null {
  return filename ? `/uploads/${filename}` : null
}
