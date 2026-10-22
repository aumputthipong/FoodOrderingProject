import type { Product, ProductFields, ProductStatus, User } from '@canteen/shared'
import { NotFoundError } from '../../common/errors'
import type { DbClient } from '../../db/client'
import type { ProductRow } from '../../db/schema'
import { getManageableShop } from '../shops/shops.service'
import { toProduct } from './products.mapper'
import * as repo from './products.repository'

const PRODUCT_NOT_FOUND = 'Product not found'

/** All products of a shop (available or not), ordered by id. */
export async function listProductsByShop(shopId: number): Promise<Product[]> {
  const rows = await repo.findByShopId(shopId)
  return rows.map(toProduct)
}

/** Rows of `shopId` whose id is in `productIds`, any status; callers decide about availability. */
export async function findProductsForCart(
  shopId: number,
  productIds: number[],
  tx?: DbClient,
): Promise<ProductRow[]> {
  return repo.findByShopIdAndIds(shopId, productIds, tx)
}

export async function createProduct(
  user: User,
  shopId: number,
  input: ProductFields,
  imageFilename: string,
): Promise<Product> {
  await getManageableShop(user, shopId)
  const id = await repo.insert({
    shopId,
    name: input.name,
    description: input.description,
    price: input.price,
    imageFilename,
  })
  return getProduct(id)
}

export async function updateProduct(
  user: User,
  productId: number,
  input: ProductFields,
  imageFilename?: string,
): Promise<Product> {
  const product = await getManageableProduct(user, productId)
  await repo.update(product.id, {
    name: input.name,
    description: input.description,
    price: input.price,
    // Without a new upload the existing image is kept.
    ...(imageFilename ? { imageFilename } : {}),
  })
  return getProduct(product.id)
}

export async function setProductStatus(
  user: User,
  productId: number,
  status: ProductStatus,
): Promise<Product> {
  const product = await getManageableProduct(user, productId)
  await repo.updateStatus(product.id, status)
  return getProduct(product.id)
}

async function getProduct(id: number): Promise<Product> {
  const row = await repo.findById(id)
  if (!row) throw new NotFoundError(PRODUCT_NOT_FOUND)
  return toProduct(row)
}

/** The product, if it exists (else 404) and `user` may manage its shop (else 403). */
async function getManageableProduct(user: User, productId: number): Promise<ProductRow> {
  const row = await repo.findById(productId)
  if (!row) throw new NotFoundError(PRODUCT_NOT_FOUND)
  await getManageableShop(user, row.shopId)
  return row
}
