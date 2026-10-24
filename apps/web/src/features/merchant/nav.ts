import { ClipboardList, Store, UtensilsCrossed } from '@lucide/vue'
import type { Component } from 'vue'

export const merchantLinks = [
  { name: 'merchant-queue', label: 'คิวออเดอร์', icon: ClipboardList, match: ['merchant-queue'] },
  {
    name: 'merchant-menu',
    label: 'เมนูในร้าน',
    icon: UtensilsCrossed,
    match: ['merchant-menu', 'merchant-menu-new', 'merchant-menu-edit'],
  },
  { name: 'merchant-shop', label: 'ข้อมูลร้าน', icon: Store, match: ['merchant-shop'] },
] as const satisfies readonly {
  name: string
  label: string
  icon: Component
  match: readonly string[]
}[]

export function isMerchantLinkActive(
  link: { match: readonly string[] },
  routeName: string | symbol | null | undefined,
): boolean {
  return typeof routeName === 'string' && link.match.includes(routeName)
}
