import type { Product } from '@canteen/shared'
import { toProduct } from './products.mapper'
import * as repo from './products.repository'

/** All products of a shop (available or not), ordered by id. */
export async function listProductsByShop(shopId: number): Promise<Product[]> {
  const rows = await repo.findByShopId(shopId)
  return rows.map(toProduct)
}
