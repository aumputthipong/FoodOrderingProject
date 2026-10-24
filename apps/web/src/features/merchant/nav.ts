export const merchantLinks = [
  { name: 'merchant-queue', label: 'คิวออเดอร์', match: ['merchant-queue'] },
  {
    name: 'merchant-menu',
    label: 'เมนูในร้าน',
    match: ['merchant-menu', 'merchant-menu-new', 'merchant-menu-edit'],
  },
  { name: 'merchant-shop', label: 'ข้อมูลร้าน', match: ['merchant-shop'] },
] as const satisfies readonly { name: string; label: string; match: readonly string[] }[]

export function isMerchantLinkActive(
  link: { match: readonly string[] },
  routeName: string | symbol | null | undefined,
): boolean {
  return typeof routeName === 'string' && link.match.includes(routeName)
}
