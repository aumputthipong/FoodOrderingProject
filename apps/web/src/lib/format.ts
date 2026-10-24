const priceFormat = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})
const priceFormatFixed = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatPrice(value: number): string {
  const formatter = Number.isInteger(value) ? priceFormat : priceFormatFixed
  return `฿${formatter.format(value)}`
}

const timeFormat = new Intl.DateTimeFormat('th-TH', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso))
}

export function formatMobile(mobile: string): string {
  if (!/^\d{10}$/.test(mobile)) return mobile
  return `${mobile.slice(0, 3)}-${mobile.slice(3, 6)}-${mobile.slice(6)}`
}

export function waitMinutes(createdAt: string, now: Date | number): number {
  const elapsed = Number(now) - new Date(createdAt).getTime()
  if (!Number.isFinite(elapsed)) return 0
  return Math.max(0, Math.floor(elapsed / 60000))
}

export function formatWait(minutes: number): string {
  return minutes === 0 ? 'เพิ่งสั่ง' : `รอ ${minutes} นาที`
}
