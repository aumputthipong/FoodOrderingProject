import { shopDetailSchema, shopSchema, type Shop, type ShopDetail } from '@canteen/shared'
import { z } from 'zod'
import { api } from '@/lib/api-client'

export function getShops(search: string): Promise<Shop[]> {
  return api.get('/api/shops', {
    schema: z.array(shopSchema),
    query: { search: search === '' ? undefined : search },
  })
}

export function getShop(id: number): Promise<ShopDetail> {
  return api.get(`/api/shops/${id}`, { schema: shopDetailSchema })
}
