import { asc, eq, like } from 'drizzle-orm'
import { db, type DbClient } from '../../db/client'
import { shops, type ShopRow } from '../../db/schema'

export type NewShopValues = {
  ownerId: number
  name: string
  description: string
  imageFilename: string | null
}

export type ShopChanges = { name: string; description: string; imageFilename?: string }

// MySQL treats % and _ in LIKE as wildcards; escape them (and the escape character itself).
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

export async function findAll(search?: string, client: DbClient = db): Promise<ShopRow[]> {
  const query = client.select().from(shops)
  const filtered = search ? query.where(like(shops.name, `%${escapeLike(search)}%`)) : query
  return filtered.orderBy(asc(shops.id))
}

export async function findById(id: number, client: DbClient = db): Promise<ShopRow | null> {
  const rows = await client.select().from(shops).where(eq(shops.id, id)).limit(1)
  return rows[0] ?? null
}

export async function findByOwnerId(
  ownerId: number,
  client: DbClient = db,
): Promise<ShopRow | null> {
  const rows = await client.select().from(shops).where(eq(shops.ownerId, ownerId)).limit(1)
  return rows[0] ?? null
}

export async function insert(values: NewShopValues, client: DbClient = db): Promise<number> {
  const [result] = await client.insert(shops).values(values)
  return result.insertId
}

export async function update(
  id: number,
  changes: ShopChanges,
  client: DbClient = db,
): Promise<void> {
  await client.update(shops).set(changes).where(eq(shops.id, id))
}
