export function isDemoHintEnabled(): boolean {
  return import.meta.env.VITE_DEMO_HINT === 'true'
}
