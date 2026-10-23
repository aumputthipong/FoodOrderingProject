import { and, asc, eq, inArray } from 'drizzle-orm'
import type { ProductStatus } from '@canteen/shared'
import { db, type DbClient } from '../../db/client'
import { products, type ProductRow } from '../../db/schema'

export type NewProductValues = {
  shopId: number
  name: string
  description: string
  price: number
  imageFilename: string | null
}

export type ProductChanges = {
  name: string
  description: string
  price: number
  imageFilename?: string
}

export async function findByShopId(shopId: number, client: DbClient = db): Promise<ProductRow[]> {
  return client.select().from(products).where(eq(products.shopId, shopId)).orderBy(asc(products.id))
}

export async function findById(id: number, client: DbClient = db): Promise<ProductRow | null> {
  const rows = await client.select().from(products).where(eq(products.id, id)).limit(1)
  return rows[0] ?? null
}

/** Rows of `shopId` whose id is in `ids` (any status). */
export async function findByShopIdAndIds(
  shopId: number,
  ids: number[],
  client: DbClient = db,
): Promise<ProductRow[]> {
  if (ids.length === 0) return []
  return client
    .select()
    .from(products)
    .where(and(eq(products.shopId, shopId), inArray(products.id, ids)))
    .orderBy(asc(products.id))
}

export async function insert(values: NewProductValues, client: DbClient = db): Promise<number> {
  const [result] = await client.insert(products).values(values)
  return result.insertId
}

export async function update(
  id: number,
  changes: ProductChanges,
  client: DbClient = db,
): Promise<void> {
  await client.update(products).set(changes).where(eq(products.id, id))
}

export async function updateStatus(
  id: number,
  status: ProductStatus,
  client: DbClient = db,
): Promise<void> {
  await client.update(products).set({ status }).where(eq(products.id, id))
}
