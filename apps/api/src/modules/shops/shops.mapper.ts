import type { Product, Shop, ShopDetail } from '@canteen/shared'
import { toImageUrl } from '../../common/http'
import type { ShopRow } from '../../db/schema'

export function toShop(row: ShopRow): Shop {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    description: row.description,
    imageUrl: toImageUrl(row.imageFilename),
    createdAt: row.createdAt.toISOString(),
  }
}

export function toShopDetail(row: ShopRow, products: Product[]): ShopDetail {
  return { ...toShop(row), products }
}
