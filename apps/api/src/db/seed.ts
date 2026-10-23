import { constants as fsConstants } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { env } from '../config/env'
import { closeDb, db, withTransaction } from './client'
import { products, shops, users } from './schema'
import { SEED_PASSWORD, seedCustomers, seedMerchants, seedProducts, seedShops } from './seed-data'

const BCRYPT_COST = 10

/** Copies the seed images that are missing from UPLOAD_DIR; existing files are never replaced. */
async function copyMissingSeedImages(filenames: string[]): Promise<void> {
  await fs.mkdir(env.UPLOAD_DIR, { recursive: true })
  for (const filename of filenames) {
    try {
      await fs.copyFile(
        path.join(env.SEED_IMAGES_DIR, filename),
        path.join(env.UPLOAD_DIR, filename),
        fsConstants.COPYFILE_EXCL,
      )
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err
    }
  }
}

export async function seed(): Promise<{ skipped: boolean }> {
  // Before the skip check: the DB can outlive the uploads volume, and its rows point at these files.
  await copyMissingSeedImages([
    ...seedShops.map((s) => s.image),
    ...seedProducts.map((p) => p.image),
  ])

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, 'merchant1'))
    .limit(1)
  if (existing) return { skipped: true }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_COST)

  await withTransaction(async (tx) => {
    const merchantIds: number[] = []
    for (const merchant of seedMerchants) {
      const [result] = await tx.insert(users).values({ ...merchant, passwordHash })
      merchantIds.push(result.insertId)
    }
    for (const customer of seedCustomers) {
      await tx.insert(users).values({ ...customer, passwordHash })
    }

    const shopIds: number[] = []
    for (const [index, shop] of seedShops.entries()) {
      const ownerId = merchantIds[index]
      if (ownerId === undefined) throw new Error(`No merchant for seed shop ${index + 1}`)
      const [result] = await tx.insert(shops).values({
        ownerId,
        name: shop.name,
        description: shop.description,
        imageFilename: shop.image,
      })
      shopIds.push(result.insertId)
    }

    for (const product of seedProducts) {
      const shopId = shopIds[product.shop - 1]
      if (shopId === undefined) throw new Error(`No seed shop ${product.shop}`)
      await tx.insert(products).values({
        shopId,
        name: product.name,
        description: product.description,
        price: product.price,
        imageFilename: product.image,
        status: product.status,
      })
    }
  })

  return { skipped: false }
}

const entry = process.argv[1]
if (entry && import.meta.url === pathToFileURL(entry).href) {
  try {
    const result = await seed()
    console.log(result.skipped ? 'Seed skipped: demo data already present' : 'Seeded demo data')
  } finally {
    await closeDb()
  }
}
