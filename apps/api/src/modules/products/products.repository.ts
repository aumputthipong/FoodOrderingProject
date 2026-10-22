import { asc, eq } from 'drizzle-orm'
import { db, type DbClient } from '../../db/client'
import { products, type ProductRow } from '../../db/schema'

export async function findByShopId(shopId: number, client: DbClient = db): Promise<ProductRow[]> {
  return client.select().from(products).where(eq(products.shopId, shopId)).orderBy(asc(products.id))
}
