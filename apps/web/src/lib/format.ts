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
