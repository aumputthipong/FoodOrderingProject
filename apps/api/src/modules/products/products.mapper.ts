import type { Product } from '@canteen/shared'
import { toImageUrl } from '../../common/http'
import type { ProductRow } from '../../db/schema'

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    shopId: row.shopId,
    name: row.name,
    description: row.description,
    price: row.price,
    imageUrl: toImageUrl(row.imageFilename),
    status: row.status,
  }
}
