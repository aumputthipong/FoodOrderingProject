import type { Shop, ShopDetail, ShopFields, User } from '@canteen/shared'
import { isDuplicateEntry } from '../../common/dbErrors'
import { ConflictError, ForbiddenError, NotFoundError } from '../../common/errors'
import { canManageShop } from '../../common/policies/shopPolicy'
import type { DbClient } from '../../db/client'
import type { ShopRow } from '../../db/schema'
import { listProductsByShop } from '../products/products.service'
import { toShop, toShopDetail } from './shops.mapper'
import * as repo from './shops.repository'

const SHOP_NOT_FOUND = 'Shop not found'
const ALREADY_HAS_SHOP = 'You already have a shop'

export async function listShops(search?: string): Promise<Shop[]> {
  const rows = await repo.findAll(search)
  return rows.map(toShop)
}

export async function getShopDetail(id: number): Promise<ShopDetail> {
  const row = await repo.findById(id)
  if (!row) throw new NotFoundError(SHOP_NOT_FOUND)
  return toShopDetail(row, await listProductsByShop(id))
}

export async function createShop(
  user: User,
  input: ShopFields,
  imageFilename: string | undefined,
): Promise<Shop> {
  if (await repo.findByOwnerId(user.id)) throw new ConflictError(ALREADY_HAS_SHOP)

  let id: number
  try {
    id = await repo.insert({
      ownerId: user.id,
      name: input.name,
      description: input.description,
      imageFilename: imageFilename ?? null,
    })
  } catch (err) {
    // Two concurrent requests can both pass the pre-check; the unique key on owner_id decides.
    if (isDuplicateEntry(err)) throw new ConflictError(ALREADY_HAS_SHOP)
    throw err
  }

  const row = await repo.findById(id)
  if (!row) throw new Error('Shop disappeared right after creation')
  return toShop(row)
}

export async function updateShop(
  user: User,
  id: number,
  input: ShopFields,
  imageFilename?: string,
): Promise<Shop> {
  await getManageableShop(user, id)
  await repo.update(id, {
    name: input.name,
    description: input.description,
    // Without a new upload the existing image is kept.
    ...(imageFilename ? { imageFilename } : {}),
  })
  const row = await repo.findById(id)
  if (!row) throw new NotFoundError(SHOP_NOT_FOUND)
  return toShop(row)
}

/** The shop, if it exists (else 404) and `user` may manage it (else 403). */
export async function getManageableShop(
  user: User,
  shopId: number,
  tx?: DbClient,
): Promise<ShopRow> {
  const row = await repo.findById(shopId, tx)
  if (!row) throw new NotFoundError(SHOP_NOT_FOUND)
  if (!canManageShop(user, row)) throw new ForbiddenError()
  return row
}
