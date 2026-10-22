# Phase 1 Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้าง backend ใหม่ใน monorepo (`apps/api` + `packages/shared`) ด้วย Express 5 + TypeScript + Drizzle ฟีเจอร์เท่าเดิม แก้บั๊ก B1–B15 มี test, Docker Compose, CI และ Swagger

**Architecture:**
- **Monorepo:** pnpm workspaces
- **`packages/shared`:** เก็บ Zod schema ของ request และ response ใช้ร่วมกันทั้งระบบ
- **`apps/api`:** แบ่งตามฟีเจอร์ (`modules/*`) โดยแต่ละ module มี routes → controller → service → repository
- **Test:** ยิง API จริงกับ MySQL test DB ใน Docker

**Tech Stack:**
- **Runtime:** Node 24 LTS, pnpm 12, TypeScript 6.0
- **API:** Express 5, Drizzle ORM (mysql2), Zod 4, zod-to-openapi
- **Test:** Vitest 5, supertest
- **Infra:** Docker Compose, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-10-22-phase1-backend-foundation-design.md` (อ่านคู่กับ plan นี้เสมอ)

### ปรับจาก spec (เหตุผลจากการตรวจเวอร์ชันจริงและข้อจำกัดของ library)
1. **Node 24 LTS แทน 22:**
   - ESLint 10 ต้องใช้ Node ≥ 22.13 และ tsup ต้องใช้ ≥ 22.18 แต่เครื่องนี้มี 22.12
   - Node 24 เป็น Active LTS ตอนนี้
2. **TypeScript `~6.0.3` แทน 7.x:** typescript-eslint 8.72 รองรับ TypeScript แค่ `<6.1.0`
3. **ไม่ใช้ `validate` middleware แต่ให้ controller เรียก `parse(schema, data)` เอง:**
   - Express 5 กำหนดให้ `req.query` เป็น read-only
   - การ parse ใน controller ได้ type ของผลลัพธ์จาก Zod โดยตรง
   - `errorHandler` แปลง `ZodError` เป็น `VALIDATION_ERROR`
4. **ชื่อ migration แรก:** drizzle-kit ตั้งชื่อไฟล์แรกเป็น `0000_initial.sql` (ใน spec เรียกว่า `0001_initial`) ดังนั้น migration ของเฟส 3 จะเป็น `0001_order_status_flow`
5. **เพิ่มไฟล์และค่า config:**
   - เพิ่ม `*.mapper.ts` ในแต่ละ module สำหรับแปลง row เป็น response
   - เพิ่ม env `MIGRATIONS_DIR`, `SEED_IMAGES_DIR`, `LOGIN_RATE_LIMIT_PER_MINUTE` (มีค่า default ทุกตัว)
6. **`apps/api/.env.test` ถูก commit:** มีแค่รหัสของ DB test ใน Docker ไม่ใช่ความลับ และ CI ต้องใช้ไฟล์นี้
7. **Checkout ปฏิเสธสินค้าที่ `not-available`:** spec ไม่ได้ระบุไว้ แต่เป็นสิ่งที่ผู้ใช้คาดหวัง (ดู Review Focus)

## Prerequisites (เจ้าของเครื่องต้องทำเอง ก่อนเริ่ม Task 1)
- **ติดตั้ง Node 24 LTS:** เช่น `winget install OpenJS.NodeJS.LTS` แล้วเปิด terminal ใหม่ ตรวจด้วย `node -v` ต้องได้ `v24.x`
- **เปิด Docker Desktop:** ให้อยู่ในสถานะ running
- **ปิด dev server เก่า:** ถ้ายังรันอยู่ (port 3000 และ 8080) ให้ปิดก่อน

## Global Constraints

- **Node และ package manager:**
  - Node `>=24` (`.nvmrc` = `24`)
  - pnpm เปิดผ่าน corepack, root `package.json` ระบุ `"packageManager": "pnpm@12.12.1"`
- **เวอร์ชัน dependency:** ใช้ caret range ตามนี้ (lockfile เป็นตัวล็อกเวอร์ชันจริง)
  - **API:** `express ^5.3.0`, `drizzle-orm ^0.45.4`, `drizzle-kit ^0.31.11`, `mysql2 ^3.24.6`
  - **Validation และเอกสาร:** `zod ^4.6.7`, `@asteasolutions/zod-to-openapi ^9.1.0`, `swagger-ui-express ^5.0.1`
  - **Middleware:** `multer ^2.5.0`, `helmet ^8.3.0`, `express-rate-limit ^8.7.1`, `cors ^2.8.6`, `bcrypt ^6.0.0`
  - **Logging:** `pino ^10.4.0`, `pino-http ^11.0.0`
  - **Dev tooling:** `typescript ~6.0.3`, `tsx ^4.23.15`, `tsup ^8.5.1`
  - **Test:** `vitest ^5.0.5`, `supertest ^7.3.1`
  - **Lint / format:** `eslint ^10.13.0`, `@eslint/js ^10.0.1`, `typescript-eslint ^8.72.0`, `globals ^17.13.0`, `prettier ^3.9.10`
  - **Types:** `@types/node ^24`, `@types/express ^5.0.6`, `@types/multer ^2.3.0`, `@types/bcrypt ^6.0.0`, `@types/cors ^2.8.19`, `@types/supertest ^7.2.1`, `@types/swagger-ui-express ^4.1.8`
  - **ห้ามใช้:** `dotenv` (ใช้ `process.loadEnvFile` ของ Node แทน)
- **TypeScript:** strict, ESM (`"type": "module"`), ห้าม `any` (ESLint `@typescript-eslint/no-explicit-any: error`)
- **Prettier:** `singleQuote: true`, `semi: false`, `printWidth: 100`
- **รูปแบบชื่อ:** JSON ใช้ camelCase ส่วน DB ใช้ snake_case (ให้ Drizzle แปลงด้วย `casing: 'snake_case'`)
- **รูปแบบ error:** `{ error: { code, message, details? } }`
  - `details` เป็น `[{ path: string, message: string }]`
  - code: `VALIDATION_ERROR` 400, `UNAUTHORIZED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409, `RATE_LIMITED` 429, `INTERNAL_ERROR` 500
- **รูป:**
  - field ของ multipart ชื่อ `image`
  - ประเภทที่รับ: `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `image/gif`
  - ขนาดไม่เกิน `UPLOAD_MAX_MB` (default 5)
  - ชื่อไฟล์ = `randomUUID() + นามสกุล`
  - DB เก็บแค่ชื่อไฟล์ ส่วน response ส่งเป็น `imageUrl: "/uploads/<filename>"` หรือ `null`
- **Auth:**
  - token = `randomBytes(32).toString('hex')` (64 ตัว) และ DB เก็บแค่ SHA-256 hex
  - bcrypt cost 10
  - login rate limit default 10 ครั้ง/นาที
- **Seed:** รหัสผ่านทุกบัญชีคือ `Password123`
- **DB:**
  - Docker MySQL `8.4` ที่ port host `3307`
  - DB `canteen`, test DB `canteen_test`, user/password `canteen`/`canteen`
  - **ห้ามรัน test กับ DB ที่ชื่อไม่ลงท้ายด้วย `_test`**
- **Migration:** ห้ามใช้ `drizzle-kit push` และห้ามแก้ไฟล์ migration ที่ commit ไปแล้ว
- **ห้ามแตะ:** `myfrontend/` และ MySQL93 ในเครื่อง (port 3306)
- **Git:** ใช้ Conventional Commits และ **ห้าม push**

## Review Focus

เคสที่ spec ไม่ได้พูดถึง แต่น่าจะเจอจริงที่สุด เรียงตามโอกาสเกิด (แต่ละข้อมี test อยู่ใน task ที่ระบุไว้):

1. **id ใน path ไม่ใช่ตัวเลข:** เช่น `/api/shops/abc` หรือ `/api/products/-1` ต้องได้ 400 `VALIDATION_ERROR` ไม่ใช่ 500 (Task 6)
2. **ส่ง `productId` ซ้ำในตะกร้า:** `PUT /api/cart/shops/:shopId/items` ที่มี `productId` ซ้ำกันต้องได้ 400 ไม่ใช่ 500 จาก UNIQUE constraint (Task 8)
3. **กด checkout ซ้ำ (double click):** checkout ด้วย `cartId` เดิมรอบที่สองต้องได้ 404 และมีออเดอร์เกิดขึ้นแค่ 1 รายการ (Task 9)
4. **ภาษาไทยและ emoji:** ชื่อร้านอย่าง `ร้านป้า 🍜` ต้องบันทึกและอ่านกลับมาได้ตรงทุกตัวอักษร (utf8mb4) (Task 3 และ Task 6)
5. **สินค้าถูกปิดขายหลังลูกค้าใส่ตะกร้าไปแล้ว:** checkout ต้องได้ 400 และตะกร้ายังอยู่ ไม่ใช่สั่งของที่ร้านปิดขายไปแล้วได้ (Task 9)

---

## File Structure

```
(root)
├── package.json, pnpm-workspace.yaml, tsconfig.base.json, eslint.config.js
├── .prettierrc, .prettierignore, .nvmrc, .gitignore (แก้), vitest.config.ts
├── docker-compose.yml, docker/mysql/init.sql, .env.example
├── .github/workflows/ci.yml
├── packages/shared/
│   ├── package.json, tsconfig.json, vitest.config.ts
│   └── src/
│       ├── index.ts, constants.ts
│       └── schemas/ common.ts, auth.ts, shop.ts, product.ts, cart.ts, order.ts (+ *.test.ts)
└── apps/api/                                   # git mv จาก backend/
    ├── package.json, tsconfig.json, tsup.config.ts, drizzle.config.ts, vitest.config.ts
    ├── Dockerfile, .dockerignore, .env.example, .env.test
    ├── seed/images/ shop-1.jpg … shop-5.png, product-1.jpg … product-5.avif
    ├── uploads/.gitkeep
    ├── src/
    │   ├── server.ts, app.ts, types/express.d.ts
    │   ├── config/env.ts
    │   ├── db/ schema.ts, client.ts, migrate.ts, seed.ts, seed-data.ts, reset.ts, migrations/
    │   ├── common/ errors.ts, validation.ts, http.ts
    │   ├── common/middlewares/ errorHandler.ts, notFound.ts, requireAuth.ts, requireRole.ts, upload.ts
    │   ├── common/policies/shopPolicy.ts
    │   ├── docs/openapi.ts
    │   └── modules/
    │       ├── health/health.routes.ts
    │       ├── auth/     auth.{routes,controller,service,repository,mapper}.ts, token.ts
    │       ├── shops/    shops.{routes,controller,service,repository,mapper}.ts
    │       ├── products/ products.{routes,controller,service,repository,mapper}.ts
    │       ├── cart/     cart.{routes,controller,service,repository,mapper}.ts
    │       └── orders/   orders.{routes,controller,service,repository,mapper}.ts
    └── tests/
        ├── setup/ global-setup.ts, each-test.ts
        ├── helpers/ app.ts, db.ts, factories.ts
        ├── fixtures/ pixel.png, not-image.txt
        ├── unit/ errors.test.ts, token.test.ts, shopPolicy.test.ts, env.test.ts
        ├── db/ schema.test.ts, seed.test.ts
        └── app.test.ts, auth.test.ts, shops.test.ts, products.test.ts, cart.test.ts, orders.test.ts, docs.test.ts
```

---

### Task 1: Monorepo scaffold, tooling และการล้างโค้ดเก่า

**Files:**
- Create:
  - root: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `.nvmrc`, `vitest.config.ts`
  - `packages/shared/{package.json,tsconfig.json,vitest.config.ts}`, `packages/shared/src/{index.ts,constants.ts,constants.test.ts}`
  - `apps/api/{package.json,tsconfig.json,vitest.config.ts}`, `apps/api/uploads/.gitkeep`
- Move: `backend/` → `apps/api/` และรูป 10 รูป → `apps/api/seed/images/`
- Delete:
  - ใน `apps/api/`: `config.js`, `index.js`, `routes/`, `middlewares/`, `utils/`, `static/`, `README.md`, `package-lock.json`
  - ที่ root: `dbpj.sql`
- Modify: `.gitignore`

**Interfaces:**
- Produces (`@canteen/shared`):
  - `ROLES = ['customer','merchant','admin'] as const`
  - `SIGNUP_ROLES = ['customer','merchant'] as const`
  - `PRODUCT_STATUSES = ['available','not-available'] as const`
  - `ORDER_STATUSES = ['waiting','finished'] as const`
  - types `Role`, `SignupRole`, `ProductStatus`, `OrderStatus`
- Produces (root scripts): `dev`, `build`, `test` (`vitest run`), `lint` (`eslint .`), `format`, `typecheck` (`pnpm -r typecheck`), `db:generate|db:migrate|db:seed|db:reset` (`pnpm --filter @canteen/api <script>`)

- [ ] **Step 1: สำรอง DB เดิม**

```bash
mkdir -p .backups
"/c/Program Files/MySQL/MySQL Server 9.3/bin/mysqldump.exe" -uroot -proot --databases webproproject > .backups/webproproject-2026-10-22.sql
```
Expected: ไฟล์มีขนาดมากกว่า 10 KB และมีบรรทัด `CREATE TABLE \`queue_items\``

- [ ] **Step 2: ย้าย `backend/` และรูป seed**

1. ตรวจว่า frontend เดิมไม่ได้อ้างถึง static ของ backend: `grep -rnE "all\.css|webfonts|static/js" myfrontend/src myfrontend/public` ต้องไม่มีผลลัพธ์
2. `git mv backend apps/api`
3. `git mv` รูปไปที่ `apps/api/seed/images/` พร้อมเปลี่ยนชื่อตามตารางนี้:

| ไฟล์เดิม (`apps/api/static/uploads/`) | ชื่อใหม่ |
|---|---|
| `shop_image-1752158155858.jpg` | `shop-1.jpg` |
| `shop_image-1752162255307.jpg` | `shop-2.jpg` |
| `shop_image-1752167446984.jpg` | `shop-3.jpg` |
| `shop_image-1752168259193.jpg` | `shop-4.jpg` |
| `shop_image-1752168404298.png` | `shop-5.png` |
| `product_image-1752159818902.jpg` | `product-1.jpg` |
| `product_image-1752161894269.jpg` | `product-2.jpg` |
| `product_image-1752161934957.jpg` | `product-3.jpg` |
| `product_image-1752163053813.webp` | `product-4.webp` |
| `product_image-1752163068987.avif` | `product-5.avif` |

4. `git rm -r` ไฟล์ทั้งหมดในหัวข้อ Delete ด้านบน (รวมรูปซ้ำ 2 รูปที่เหลืออยู่ใน `static/uploads/`)

- [ ] **Step 3: สร้าง root tooling**

- **`pnpm-workspace.yaml`:** `packages: ['apps/*', 'packages/*']`
- **root `package.json`:** `private: true`, `name: canteen-ordering`, `type: module`, `packageManager`, `engines.node: ">=24"`, scripts ตามหัวข้อ Interfaces และ devDependencies สำหรับ lint / format / test / typescript
- **`tsconfig.base.json`:** `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `target: ES2023`, `module: Preserve`, `moduleResolution: Bundler`, `noEmit`, `skipLibCheck`, `types: ["node"]`
- **`eslint.config.js`:** `@eslint/js` recommended + `typescript-eslint` recommended + `no-explicit-any: error`
  - ignores: `myfrontend/**`, `**/dist/**`, `**/uploads/**`, `**/src/db/migrations/**`, `.backups/**`
- **root `vitest.config.ts`:** `test.projects: ['packages/*', 'apps/*']`
- **`.gitignore`:** เพิ่ม `.backups/`, `apps/api/uploads/*`, `!apps/api/uploads/.gitkeep`, `apps/api/tmp/`, `dist/`, `coverage/` และคงบรรทัด `.claude/`, `node_modules`, `.env` ไว้

- [ ] **Step 4: เขียน test ของ `packages/shared` ที่ต้อง fail ก่อน**

```ts
// packages/shared/src/constants.test.ts
import { ROLES, SIGNUP_ROLES, PRODUCT_STATUSES, ORDER_STATUSES } from './constants'
test('signup roles exclude admin', () => {
  expect(SIGNUP_ROLES).toEqual(['customer', 'merchant'])
  expect(ROLES).toEqual(['customer', 'merchant', 'admin'])
})
test('statuses match the database enums', () => {
  expect(PRODUCT_STATUSES).toEqual(['available', 'not-available'])
  expect(ORDER_STATUSES).toEqual(['waiting', 'finished'])
})
```

- [ ] **Step 5: สร้าง `packages/shared` และ `apps/api` skeleton**

- **`packages/shared/package.json`:** `name: @canteen/shared`, `type: module`, `exports: { ".": "./src/index.ts" }`, dependency `zod`, script `typecheck: tsc -p .`
- **`apps/api/package.json`:** `name: @canteen/api`, `type: module` และติดตั้ง dependency ทั้งหมดตาม Global Constraints ตั้งแต่ task นี้ (lockfile จะได้ล็อกครั้งเดียว) รวมถึง `"@canteen/shared": "workspace:*"`
- **scripts ของ api:**
  - `dev: tsx watch src/server.ts`
  - `build: tsup`
  - `typecheck: tsc -p .`
  - `db:generate: drizzle-kit generate`
  - `db:migrate: tsx src/db/migrate.ts`
  - `db:seed: tsx src/db/seed.ts`
  - `db:reset: tsx src/db/reset.ts`
- **`tsconfig.json` ของทั้งสอง package:** extends base และ include `src`, `tests`
- **`apps/api/vitest.config.ts`:** ใส่ `passWithNoTests: true` ไว้ก่อน เพราะ api ยังไม่มี test จนถึง Task 2

- [ ] **Step 6: ติดตั้งแล้วรัน test**

```bash
corepack enable && pnpm install
pnpm test
```
Expected: `constants.test.ts` ผ่าน 2 tests

- [ ] **Step 7: รัน lint, typecheck และ format check**

Run: `pnpm lint && pnpm typecheck && pnpm prettier --check .`
Expected: ไม่มี error

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold pnpm monorepo and remove legacy JS backend"
```

---

### Task 2: Docker MySQL และ config จาก env

**Files:**
- Create: `docker-compose.yml` (มีเฉพาะ service `db` ใน task นี้), `docker/mysql/init.sql`, `.env.example`, `apps/api/.env.example`, `apps/api/.env.test`, `apps/api/src/config/env.ts`, `apps/api/tests/unit/env.test.ts`
- Modify: `apps/api/vitest.config.ts` (อ่าน `.env.test` ด้วย `util.parseEnv` แล้วใส่ใน `test.env`)

**Interfaces:**
- Produces:
  - `parseEnv(source: Record<string, string | undefined>): Env`
  - `env: Env`
  - `type Env = { NODE_ENV: 'development'|'test'|'production'; PORT: number; DATABASE_URL: string; CORS_ORIGINS: string[]; UPLOAD_DIR: string; UPLOAD_MAX_MB: number; LOGIN_RATE_LIMIT_PER_MINUTE: number; MIGRATIONS_DIR: string; SEED_IMAGES_DIR: string }`
- **ค่า default:**
  - `NODE_ENV=development`
  - `PORT=3000`
  - `CORS_ORIGINS=http://localhost:5173`
  - `UPLOAD_DIR=uploads`
  - `UPLOAD_MAX_MB=5`
  - `LOGIN_RATE_LIMIT_PER_MINUTE=10`
  - `MIGRATIONS_DIR=src/db/migrations`
  - `SEED_IMAGES_DIR=seed/images`
  - `DATABASE_URL` ไม่มี default (ต้องระบุเสมอ)
- **path ทุกตัว:** resolve เป็น absolute จาก `process.cwd()`
- **การโหลด `.env`:** ถ้า `NODE_ENV !== 'test'` และมีไฟล์ `.env` อยู่ ให้เรียก `process.loadEnvFile('.env')` ก่อน parse

- [ ] **Step 1: เขียน test ที่ต้อง fail**

```ts
// apps/api/tests/unit/env.test.ts
const base = { DATABASE_URL: 'mysql://u:p@localhost:3307/canteen' }
test('applies defaults', () => {
  const e = parseEnv(base)
  expect(e.PORT).toBe(3000)
  expect(e.UPLOAD_MAX_MB).toBe(5)
  expect(e.LOGIN_RATE_LIMIT_PER_MINUTE).toBe(10)
  expect(e.CORS_ORIGINS).toEqual(['http://localhost:5173'])
  expect(path.isAbsolute(e.UPLOAD_DIR)).toBe(true)
})
test('splits and trims CORS_ORIGINS', () => {
  expect(parseEnv({ ...base, CORS_ORIGINS: 'http://a.test, http://b.test' }).CORS_ORIGINS)
    .toEqual(['http://a.test', 'http://b.test'])
})
test('throws naming the missing variable', () => {
  expect(() => parseEnv({})).toThrow(/DATABASE_URL/)
})
test('rejects a non-numeric PORT', () => {
  expect(() => parseEnv({ ...base, PORT: 'abc' })).toThrow(/PORT/)
})
```

- [ ] **Step 2: รันให้เห็นว่า fail**

Run: `pnpm --filter @canteen/api exec vitest run tests/unit/env.test.ts`
Expected: FAIL เพราะยังไม่มี `parseEnv`

- [ ] **Step 3: Implement `env.ts`**

ใช้ Zod schema กับ `z.coerce.number().int()` สำหรับตัวเลข ถ้า parse ไม่ผ่านให้ throw `Error` ที่ข้อความรวมชื่อตัวแปรทุกตัวที่ผิด

- [ ] **Step 4: สร้างไฟล์ Docker และ env**

- **`docker-compose.yml` service `db`:**
  - image `mysql:8.4`
  - `command: --character-set-server=utf8mb4 --collation-server=utf8mb4_0900_ai_ci`
  - env `MYSQL_ROOT_PASSWORD=root`, `MYSQL_DATABASE=canteen`, `MYSQL_USER=canteen`, `MYSQL_PASSWORD=canteen`
  - ports `3307:3306`
  - volume `db-data:/var/lib/mysql`
  - mount `./docker/mysql/init.sql:/docker-entrypoint-initdb.d/init.sql:ro`
  - healthcheck `mysqladmin ping -h localhost -uroot -proot` ทุก 5 วินาที
- **`init.sql`:**
  ```sql
  CREATE DATABASE IF NOT EXISTS canteen_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
  GRANT ALL PRIVILEGES ON canteen_test.* TO 'canteen'@'%';
  ```
- **`apps/api/.env.test`:**
  - `NODE_ENV=test`
  - `DATABASE_URL=mysql://canteen:canteen@localhost:3307/canteen_test`
  - `UPLOAD_DIR=tmp/test-uploads`
  - `UPLOAD_MAX_MB=1`
  - `LOGIN_RATE_LIMIT_PER_MINUTE=1000`
- **`apps/api/.env.example`:** ค่าตามข้อ 10 ของ spec
- **root `.env.example`:** ค่า MySQL ที่ compose ใช้ พร้อม comment อธิบาย

- [ ] **Step 5: รัน test และเปิด DB**

```bash
pnpm --filter @canteen/api exec vitest run tests/unit/env.test.ts
docker compose up -d db && docker compose ps
docker compose exec db mysql -ucanteen -pcanteen -e "SHOW DATABASES"
```
Expected:
- test ผ่าน 4 tests
- `db` มีสถานะ `healthy`
- ผลลัพธ์ของ `SHOW DATABASES` มีทั้ง `canteen` และ `canteen_test`

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(api): add docker mysql and validated env config"
```

---

### Task 3: Drizzle schema, migration แรก และระบบ test

**Files:**
- Create:
  - `apps/api/drizzle.config.ts`
  - `apps/api/src/db/{schema.ts,client.ts,migrate.ts}`
  - `apps/api/src/db/migrations/*` (สร้างโดย drizzle-kit)
  - `apps/api/tests/setup/{global-setup.ts,each-test.ts}`, `apps/api/tests/helpers/db.ts`, `apps/api/tests/db/schema.test.ts`
- Modify: `apps/api/vitest.config.ts` (`globalSetup`, `setupFiles`, `fileParallelism: false`)

**Interfaces:**
- Produces (`db/schema.ts`):
  - tables `users`, `authTokens`, `shops`, `products`, `carts`, `cartItems`, `orders`, `orderItems`
  - คอลัมน์และ constraint ตามข้อ 6.1 ของ spec ชื่อคอลัมน์ใน TS เป็น camelCase
  - `price` / `unitPrice` เป็น `decimal(10,2)` แบบ `mode: 'number'` ถ้า drizzle 0.45 ยังไม่รองรับ mode นี้ ให้ mapper ใน task ถัดๆ ไปแปลงด้วย `Number()` แทน
- Produces (`db/client.ts`):
  - `db` (drizzle instance จาก mysql2 pool + `casing: 'snake_case'`)
  - `type Db`, `type Tx`, `type DbClient = Db | Tx`
  - `withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>`
  - `closeDb(): Promise<void>`
- Produces (`db/migrate.ts`):
  - `runMigrations(): Promise<void>` อ่านไฟล์จาก `env.MIGRATIONS_DIR`
  - เมื่อรันจาก CLI ให้ migrate แล้ว `closeDb()`
- Produces (`tests/helpers/db.ts`):
  - `resetDb(): Promise<void>` ทำ `SET FOREIGN_KEY_CHECKS=0` → TRUNCATE ทุกตารางยกเว้น `__drizzle_migrations` → เปิด FK check กลับ
- Global setup:
  - ถ้าชื่อ DB ใน `DATABASE_URL` ไม่ลงท้ายด้วย `_test` ให้ throw ข้อความ `Refusing to run tests against non-test database`
  - เรียก `runMigrations()` แล้วลบโฟลเดอร์ `UPLOAD_DIR` ทิ้งก่อนเริ่ม test
  - `each-test.ts` เรียก `beforeEach(resetDb)` และ `afterAll(closeDb)`

- [ ] **Step 1: เขียน test ที่ต้อง fail**

```ts
// apps/api/tests/db/schema.test.ts
test('creates exactly the expected tables', async () => {
  const names = await listTables() // query information_schema.tables ของ DB ปัจจุบัน
  expect(names.sort()).toEqual(['__drizzle_migrations','auth_tokens','cart_items','carts',
    'order_items','orders','products','shops','users'])
})
test('rejects cart item quantity below 1', async () => {
  // insert user, shop, product, cart โดยตรง แล้ว insert cart_items quantity 0
  await expect(insertCartItem({ quantity: 0 })).rejects.toThrow()
})
test('allows only one shop per owner', async () => {
  await expect(insertShop({ ownerId })).rejects.toThrow(/Duplicate/)  // insert ครั้งที่สอง
})
test('stores Thai text and emoji intact', async () => {
  const id = await insertShop({ name: 'ร้านป้า 🍜' })
  expect((await getShop(id)).name).toBe('ร้านป้า 🍜')
})
test('withTransaction rolls back when the callback throws', async () => {
  await expect(withTransaction(async (tx) => { await insertUserWith(tx); throw new Error('x') }))
    .rejects.toThrow('x')
  expect(await countUsers()).toBe(0)
})
```
helper `insert*`, `listTables`, `getShop` และ `countUsers` เป็นฟังก์ชันสั้นๆ ในไฟล์ test เอง ที่เรียก `db` ตรงๆ

- [ ] **Step 2: รันให้เห็นว่า fail**

Run: `pnpm --filter @canteen/api exec vitest run tests/db/schema.test.ts`
Expected: FAIL เพราะยังไม่มี schema และ migration

- [ ] **Step 3: เขียน `schema.ts`, `client.ts`, `migrate.ts`, `drizzle.config.ts` และไฟล์ test setup**

- `drizzle.config.ts` ใช้ `dialect: 'mysql'`, `schema: './src/db/schema.ts'`, `out: './src/db/migrations'`, `casing: 'snake_case'`
- ทุก FK ใช้ `onDelete: 'cascade'` ยกเว้น `order_items.product_id` ที่เป็น `restrict`

- [ ] **Step 4: สร้าง migration แรกแล้วอ่านทวน**

Run: `pnpm --filter @canteen/api exec drizzle-kit generate --name initial`
Expected:
- ได้ไฟล์ `src/db/migrations/0000_initial.sql`
- ในไฟล์มี `CHECK` ของ quantity, UNIQUE ของ `owner_id`, `(user_id, shop_id)`, `(cart_id, product_id)`, `username`, `token_hash` และ ENUM ทั้ง 3 ตัว

- [ ] **Step 5: รัน test**

Run: `pnpm --filter @canteen/api exec vitest run tests/db/schema.test.ts`
Expected: PASS 5 tests

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(api): add drizzle schema, initial migration and db test harness"
```

---

### Task 4: App skeleton, error handling และ health

**Files:**
- Create:
  - `apps/api/src/{app.ts,server.ts,types/express.d.ts}`
  - `apps/api/src/common/{errors.ts,validation.ts,http.ts}`
  - `apps/api/src/common/middlewares/{errorHandler.ts,notFound.ts}`
  - `apps/api/src/modules/health/health.routes.ts`
  - `packages/shared/src/schemas/common.ts`
  - `apps/api/tests/helpers/app.ts`, `apps/api/tests/unit/errors.test.ts`, `apps/api/tests/app.test.ts`
- Modify: `packages/shared/src/index.ts` (export schemas)

**Interfaces:**
- Produces (shared `common.ts`):
  - `idParamSchema = z.object({ id: z.coerce.number().int().positive() })`
  - `shopIdParamSchema` (มี key `shopId`)
  - `errorCodeSchema`
  - `errorResponseSchema`
  - type `ErrorCode`, `ErrorResponse`
- Produces (`errors.ts`):
  - `class AppError extends Error { status: number; code: ErrorCode; details?: { path: string; message: string }[] }`
  - subclass `ValidationError(message, details?)`, `UnauthorizedError(message = 'Authentication required')`, `ForbiddenError(message = 'You do not have permission to perform this action')`, `NotFoundError(message = 'Resource not found')`, `ConflictError(message)`
- Produces (`validation.ts`): `parse<S extends z.ZodType>(schema: S, data: unknown): z.infer<S>` ถ้าไม่ผ่านให้ throw `ZodError` ต่อไปให้ error handler
- Produces (`errorHandler.ts`):
  - `toErrorResponse(err: unknown): { status: number; body: ErrorResponse }` (pure function)
  - `errorHandler: ErrorRequestHandler` ลบไฟล์ `req.file?.path` ทิ้งถ้ามี แล้ว log ด้วย `req.log` เมื่อ status เป็น 500
- Produces (`http.ts`): `toImageUrl(filename: string | null): string | null`
- Produces (`app.ts`): `createApp(options?: { loginRateLimitPerMinute?: number }): Express`
  - ลำดับ middleware: `helmet()` → `cors({ origin: env.CORS_ORIGINS })` → `pinoHttp` (ปิดเมื่อ `NODE_ENV=test`) → `express.json()` → `/uploads` static → `/api` routers → `notFound` → `errorHandler`
- Produces (`types/express.d.ts`): `req.user?: User` และ `req.authTokenHash?: string` (type `User` มาจาก shared และจะถูกนิยามใน Task 5 ใน task นี้ให้ประกาศ `user?: unknown` ไว้ก่อน แล้ว Task 5 ค่อยเปลี่ยน)
- Produces (`tests/helpers/app.ts`): `api(options?) => supertest(createApp(options))` และ `auth(token: string) => ({ Authorization: \`Bearer ${token}\` })`

- [ ] **Step 1: เขียน unit test ที่ต้อง fail**

```ts
// apps/api/tests/unit/errors.test.ts
test('maps ZodError to VALIDATION_ERROR with paths', () => {
  const err = z.object({ price: z.number() }).safeParse({ price: 'x' }).error
  const { status, body } = toErrorResponse(err)
  expect(status).toBe(400)
  expect(body.error.code).toBe('VALIDATION_ERROR')
  expect(body.error.details?.[0]?.path).toBe('price')
})
test('maps AppError subclasses to their status and code', () => {
  expect(toErrorResponse(new ConflictError('taken'))).toEqual(
    { status: 409, body: { error: { code: 'CONFLICT', message: 'taken' } } })
  expect(toErrorResponse(new ForbiddenError()).status).toBe(403)
})
test('maps multer size errors to VALIDATION_ERROR', () => {
  expect(toErrorResponse(new multer.MulterError('LIMIT_FILE_SIZE', 'image')).body.error.code)
    .toBe('VALIDATION_ERROR')
})
test('hides internals of unexpected errors', () => {
  const { status, body } = toErrorResponse(new Error('ER_NO_SUCH_TABLE select * from x'))
  expect(status).toBe(500)
  expect(body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
})
```

- [ ] **Step 2: เขียน integration test ที่ต้อง fail**

```ts
// apps/api/tests/app.test.ts
test('GET /api/health', async () => {
  const res = await api().get('/api/health')
  expect(res.status).toBe(200)
  expect(res.body).toEqual({ status: 'ok' })
})
test('unknown route returns NOT_FOUND shape', async () => {
  const res = await api().get('/api/nope')
  expect(res.status).toBe(404)
  expect(res.body.error.code).toBe('NOT_FOUND')
})
test('sets security headers', async () => {
  expect((await api().get('/api/health')).headers['x-content-type-options']).toBe('nosniff')
})
test('allows only configured CORS origins', async () => {
  const ok = await api().get('/api/health').set('Origin', 'http://localhost:5173')
  expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173')
  const bad = await api().get('/api/health').set('Origin', 'http://evil.test')
  expect(bad.headers['access-control-allow-origin']).toBeUndefined()
})
```

- [ ] **Step 3: รันให้เห็นว่า fail**

Run: `pnpm --filter @canteen/api exec vitest run tests/unit/errors.test.ts tests/app.test.ts`
Expected: FAIL

- [ ] **Step 4: Implement ทุกไฟล์ใน Files**

- **`server.ts`:** `createApp().listen(env.PORT)` และเมื่อได้ `SIGTERM` / `SIGINT` ให้ปิด server แล้ว `closeDb()`
- **`toErrorResponse`:** ข้อความของ `ZodError` ใช้ `'Invalid request'` โดย details มาจาก `issue.path.join('.')` และ `issue.message`

- [ ] **Step 5: รัน test และตรวจด้วยมือ**

Run: `pnpm --filter @canteen/api exec vitest run` และ `pnpm --filter @canteen/api dev` แล้ว `curl localhost:3000/api/health`
Expected:
- test ผ่านทั้งหมด
- curl ได้ `{"status":"ok"}`

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(api): add express 5 app skeleton with central error handling"
```

---

### Task 5: Auth module

**Files:**
- Create:
  - `packages/shared/src/schemas/auth.ts`, `packages/shared/src/schemas/auth.test.ts`
  - `apps/api/src/modules/auth/{auth.routes.ts,auth.controller.ts,auth.service.ts,auth.repository.ts,auth.mapper.ts,token.ts}`
  - `apps/api/src/common/middlewares/{requireAuth.ts,requireRole.ts}`
  - `apps/api/tests/unit/token.test.ts`, `apps/api/tests/auth.test.ts`, `apps/api/tests/helpers/factories.ts`
- Modify: `app.ts` (mount `/api/auth` และ rate limiter บน `POST /api/auth/login`), `types/express.d.ts` (`user?: User`)

**Interfaces:**
- Produces (shared):
  - `signupSchema`: username 5–20 ตัว, password ตามกฎใน spec, `confirmPassword` ต้องตรงกัน (refine ที่ path `['confirmPassword']`), firstName และ lastName 1–150 ตัว, email ไม่เกิน 100 ตัว, mobile `/^0[0-9]{9}$/`, role อยู่ใน `SIGNUP_ROLES`
  - `loginSchema`, `userSchema`, `loginResponseSchema = { token, user }`
  - type `SignupInput`, `LoginInput`, `User`, `LoginResponse`
- Produces (`token.ts`):
  - `generateToken(): string` ได้ 64 ตัวอักษร hex
  - `hashToken(token: string): string` ได้ SHA-256 hex
- Produces (`auth.service.ts`):
  - `signup(input: SignupInput): Promise<User>`
  - `login(input: LoginInput): Promise<LoginResponse>`
  - `logout(tokenHash: string): Promise<void>`
  - `findUserByToken(token: string): Promise<{ user: User; tokenHash: string } | null>`
- Produces (middleware):
  - `requireAuth: RequestHandler` ตั้งค่า `req.user` และ `req.authTokenHash` ถ้าไม่ผ่านให้ throw `UnauthorizedError`
  - `requireRole(...roles: Role[]): RequestHandler` ถ้า role ไม่ตรงให้ throw `ForbiddenError`
- Produces (`tests/helpers/factories.ts`):
  - `createUser(overrides?: Partial<{ username: string; role: Role; firstName: string; mobile: string }>): Promise<{ id: number; username: string; password: string; role: Role }>` insert ตรงเข้า DB ด้วย bcrypt และรหัสผ่าน default `Password123`
  - `loginAs(user: { username: string; password: string }): Promise<string>` คืน token
- `User.shopId`: ได้มาจาก LEFT JOIN `shops` ด้วย `owner_id`

- [ ] **Step 1: เขียน unit test ที่ต้อง fail**

```ts
// packages/shared/src/schemas/auth.test.ts
const valid = { username: 'somchai', password: 'Passw0rd', confirmPassword: 'Passw0rd',
  firstName: 'Som', lastName: 'Chai', email: 's@example.com', mobile: '0812345678', role: 'customer' }
test.each([['short1A'], ['alllower1'], ['ALLUPPER1'], ['NoDigitsHere']])('rejects weak password %s', (pw) => {
  expect(signupSchema.safeParse({ ...valid, password: pw, confirmPassword: pw }).success).toBe(false)
})
test('rejects admin role (B1)', () => {
  const r = signupSchema.safeParse({ ...valid, role: 'admin' })
  expect(r.error?.issues[0]?.path).toEqual(['role'])
})
test('reports confirmPassword mismatch on its own path', () => {
  const r = signupSchema.safeParse({ ...valid, confirmPassword: 'Other0ne' })
  expect(r.error?.issues[0]?.path).toEqual(['confirmPassword'])
})

// apps/api/tests/unit/token.test.ts
test('generates 64-char hex tokens that differ', () => {
  expect(generateToken()).toMatch(/^[0-9a-f]{64}$/)
  expect(generateToken()).not.toBe(generateToken())
})
test('hashToken is sha256 hex', () => {
  expect(hashToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})
```

- [ ] **Step 2: เขียน integration test ที่ต้อง fail**

```ts
// apps/api/tests/auth.test.ts
test('signup returns the user without secrets', async () => {
  const res = await api().post('/api/auth/signup').send(validSignup)
  expect(res.status).toBe(201)
  expect(res.body).toMatchObject({ username: 'somchai', role: 'customer', shopId: null })
  expect(res.body).not.toHaveProperty('password')
  expect(res.body).not.toHaveProperty('passwordHash')
})
test('signup rejects admin role (B1)', async () => {
  const res = await api().post('/api/auth/signup').send({ ...validSignup, role: 'admin' })
  expect(res.status).toBe(400)
  expect(res.body.error.details).toContainEqual(expect.objectContaining({ path: 'role' }))
})
test('signup rejects a taken username with 409', ...)              // สมัครซ้ำ → 409 CONFLICT
test('login stores only the token hash (B11)', async () => {
  const user = await createUser()
  const { body } = await api().post('/api/auth/login').send({ username: user.username, password: user.password })
  expect(body.token).toMatch(/^[0-9a-f]{64}$/)
  const rows = await db.select().from(authTokens)
  expect(rows[0]?.tokenHash).toBe(hashToken(body.token))
})
test('login fails with the same 401 message for unknown user and wrong password', ...)
test('each login issues a new working token', ...)                // login 2 ครั้ง → token ต่างกัน และใช้กับ /me ได้ทั้งคู่
test('GET /me requires a valid Bearer token', ...)                 // ไม่มี header / token มั่ว / 'Token x' → 401
test('logout revokes the current token (B11)', async () => {
  const token = await loginAs(await createUser())
  expect((await api().post('/api/auth/logout').set('Authorization', `Bearer ${token}`)).status).toBe(204)
  expect((await api().get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(401)
})
test('rate limits login attempts', async () => {
  const app = api({ loginRateLimitPerMinute: 3 })
  for (let i = 0; i < 3; i++) await app.post('/api/auth/login').send({ username: 'x', password: 'y' })
  const res = await app.post('/api/auth/login').send({ username: 'x', password: 'y' })
  expect(res.status).toBe(429)
  expect(res.body.error.code).toBe('RATE_LIMITED')
})
```
หมายเหตุ: test ที่เป็น `...` ให้เขียน assertion ตามที่ comment ระบุไว้

- [ ] **Step 3: รันให้เห็นว่า fail**

Run: `pnpm test -- auth token`
Expected: FAIL

- [ ] **Step 4: Implement ทุกไฟล์ใน Files**

- **`api()` ใน test:** เพราะ `api()` สร้าง app ใหม่ทุกครั้ง test rate limit ต้องใช้ instance เดียวกันตลอด (ตัวแปร `app` ในตัวอย่าง)
- **rate limiter:** สร้างภายใน `createApp` และใช้ `handler` ที่ throw / ส่ง error ในรูปแบบกลางด้วย code `RATE_LIMITED`

- [ ] **Step 5: รัน test**

Run: `pnpm test`
Expected: PASS ทั้งหมด

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(api): add auth module with hashed opaque tokens (fixes B1, B11)"
```

---

### Task 6: Uploads และ Shops module

**Files:**
- Create:
  - `packages/shared/src/schemas/{shop.ts,product.ts}` (ใน task นี้มีแค่ `productSchema` เพราะต้องใช้ใน shop detail)
  - `apps/api/src/common/middlewares/upload.ts`, `apps/api/src/common/policies/shopPolicy.ts`
  - `apps/api/src/modules/shops/shops.{routes,controller,service,repository,mapper}.ts`
  - `apps/api/src/modules/products/products.{service,repository,mapper}.ts` (ใน task นี้มีแค่ส่วนที่ใช้ list สินค้า)
  - `apps/api/tests/fixtures/{pixel.png,not-image.txt}`, `apps/api/tests/unit/shopPolicy.test.ts`, `apps/api/tests/shops.test.ts`
- Modify: `app.ts`, `tests/helpers/factories.ts`

**Interfaces:**
- Produces (shared):
  - `shopFieldsSchema = { name: string 1..255 (trim), description: string 1..2000 (trim) }`
  - `shopSearchQuerySchema = { search?: string }`
  - `shopSchema`, `shopDetailSchema = shopSchema.extend({ products: z.array(productSchema) })`
  - `productSchema = { id, shopId, name, description, price: number, imageUrl: string|null, status }`
  - type `ShopFields`, `Shop`, `ShopDetail`, `Product`
- Produces (`db/schema.ts` type alias ที่ module ใช้): `type ShopRow = typeof shops.$inferSelect` และ `type ProductRow = typeof products.$inferSelect`
- Produces (`upload.ts`): `uploadImage: RequestHandler`
  - เป็น `multer.diskStorage` ที่ปลายทางคือ `env.UPLOAD_DIR` (สร้างโฟลเดอร์ถ้ายังไม่มี)
  - กรองประเภทไฟล์ ถ้าไม่ผ่านให้ส่ง `ValidationError` พร้อม `details: [{ path: 'image', message }]`
  - จำกัดขนาด `env.UPLOAD_MAX_MB * 1024 * 1024`
- Produces (`shopPolicy.ts`): `canManageShop(user: Pick<User,'id'|'role'>, shop: { ownerId: number }): boolean`
- Produces (`shops.service.ts`):
  - `listShops(search?: string): Promise<Shop[]>`
  - `getShopDetail(id: number): Promise<ShopDetail>`
  - `createShop(user: User, input: ShopFields, imageFilename: string | undefined): Promise<Shop>`
  - `updateShop(user: User, id: number, input: ShopFields, imageFilename?: string): Promise<Shop>`
  - `getManageableShop(user: User, shopId: number, tx?: DbClient): Promise<ShopRow>` ถ้าไม่มีร้านให้ throw `NotFoundError` ถ้าไม่มีสิทธิ์ให้ throw `ForbiddenError` (Task 7 และ 9 ใช้ฟังก์ชันนี้)
- Produces (`products.service.ts`): `listProductsByShop(shopId: number): Promise<Product[]>`
- Produces (factories):
  - `createMerchantWithShop(overrides?): Promise<{ user; token: string; shop: { id: number } }>`
  - `fixtureImage = path ไปที่ tests/fixtures/pixel.png`
- Routes (`*.routes.ts`):
  - `POST /api/shops`: `requireAuth`, `requireRole('merchant','admin')`, `uploadImage`
  - `PUT /api/shops/:id`: `requireAuth`, `uploadImage`

- [ ] **Step 1: เขียน unit test ที่ต้อง fail**

```ts
// apps/api/tests/unit/shopPolicy.test.ts
test('owner and admin can manage, others cannot', () => {
  expect(canManageShop({ id: 1, role: 'merchant' }, { ownerId: 1 })).toBe(true)
  expect(canManageShop({ id: 9, role: 'admin' }, { ownerId: 1 })).toBe(true)
  expect(canManageShop({ id: 2, role: 'merchant' }, { ownerId: 1 })).toBe(false)
})
```

- [ ] **Step 2: เขียน integration test ที่ต้อง fail**

```ts
// apps/api/tests/shops.test.ts
test('merchant creates a shop; filename stored without path (B14)', async () => {
  const token = await loginAs(await createUser({ role: 'merchant' }))
  const res = await api().post('/api/shops').set(auth(token))
    .field('name', 'Noodle House').field('description', 'Tasty').attach('image', fixtureImage)
  expect(res.status).toBe(201)
  expect(res.body.imageUrl).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/)
  const [row] = await db.select().from(shops)
  expect(row?.imageFilename).not.toMatch(/[\\/]/)
  expect(fs.existsSync(path.join(env.UPLOAD_DIR, row!.imageFilename!))).toBe(true)
})
test('second shop for the same merchant is 409 (B8)', ...)
test('customer cannot create a shop (403); anonymous gets 401', ...)
test('missing image is a validation error on path image', ...)
test('rejects non-image files and files over UPLOAD_MAX_MB', ...)  // not-image.txt → 400; Buffer 1.1MB ชื่อ big.png → 400
test('removes the uploaded file when field validation fails', async () => {
  // name ว่างแต่แนบรูปที่ถูกต้อง → 400 และจำนวนไฟล์ใน UPLOAD_DIR เท่ากับก่อนยิง request
})
test('search filters by name (B9)', async () => {
  // สร้าง 'Noodle House' กับ 'Drink Shop' → ?search=drink ได้เฉพาะ 'Drink Shop'
})
test('shop detail includes all products of that shop', ...)       // ได้ทั้ง available และ not-available
test('non-numeric or negative id is a 400, unknown id is a 404', async () => {
  expect((await api().get('/api/shops/abc')).status).toBe(400)
  expect((await api().get('/api/shops/-1')).status).toBe(400)
  expect((await api().get('/api/shops/999999')).status).toBe(404)
})
test('Thai and emoji names round-trip through the API', ...)      // 'ร้านป้า 🍜'
test('update without image keeps the old image (B3)', ...)
test('other merchant cannot update (403), admin can (200)', ...)
test('/api/auth/me reports shopId after creating a shop', ...)
```

- [ ] **Step 3: รันให้เห็นว่า fail**

Run: `pnpm test -- shops shopPolicy`
Expected: FAIL

- [ ] **Step 4: Implement ทุกไฟล์ใน Files**

- **ลำดับใน controller ของ POST / PUT:** `parse(idParamSchema, req.params)` (เฉพาะ PUT) → `parse(shopFieldsSchema, req.body)` → ตอน POST ถ้าไม่มี `req.file` ให้ throw `ValidationError` ที่ path `image`
- **ค้นหา:** ใช้ `like(shops.name, '%' + search + '%')` (collation ของ MySQL ทำให้ไม่สนตัวพิมพ์เล็ก/ใหญ่อยู่แล้ว)

- [ ] **Step 5: รัน test**

Run: `pnpm test`
Expected: PASS ทั้งหมด

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(api): add shops module with image uploads (fixes B3, B8, B9, B14)"
```

---

### Task 7: Products module

**Files:**
- Modify:
  - `packages/shared/src/schemas/product.ts`
  - `apps/api/src/modules/products/products.{service,repository,mapper}.ts`
  - `app.ts`
- Create:
  - `apps/api/src/modules/products/{products.routes.ts,products.controller.ts}`
  - `apps/api/tests/products.test.ts`
- Modify: `tests/helpers/factories.ts`

**Interfaces:**
- Consumes: `getManageableShop` (Task 6), `uploadImage`, `requireAuth`, `parse`
- Produces (shared):
  - `productFieldsSchema = { name: 1..255, description: 1..2000, price: z.coerce.number().positive().max(99999999.99) }`
  - `productStatusBodySchema = { status: z.enum(PRODUCT_STATUSES) }`
  - type `ProductFields`
- Produces (`products.service.ts`):
  - `createProduct(user, shopId, input, imageFilename): Promise<Product>`
  - `updateProduct(user, productId, input, imageFilename?): Promise<Product>`
  - `setProductStatus(user, productId, status): Promise<Product>`
  - `findProductsForCart(shopId: number, productIds: number[], tx?): Promise<ProductRow[]>` (Task 8 ใช้)
- Produces (factories): `createProduct(shopId: number, overrides?: Partial<{ name: string; price: number; status: ProductStatus }>): Promise<{ id: number; price: number }>` (insert ตรง, ค่า default `status: 'available'`, `price: 50`)
- Routes:
  - `POST /api/shops/:shopId/products`
  - `PUT /api/products/:id`
  - `PATCH /api/products/:id/status`

- [ ] **Step 1: เขียน test ที่ต้อง fail**

```ts
// apps/api/tests/products.test.ts
test('owner adds a product; defaults to not-available; price is a number', async () => {
  const { token, shop } = await createMerchantWithShop()
  const res = await api().post(`/api/shops/${shop.id}/products`).set(auth(token))
    .field('name', 'ข้าวผัด').field('description', 'โบราณ').field('price', '45.50').attach('image', fixtureImage)
  expect(res.status).toBe(201)
  expect(res.body).toMatchObject({ shopId: shop.id, price: 45.5, status: 'not-available' })
})
test.each([['-1'], ['0'], ['abc']])('rejects price %s on path price', ...)
test('other merchant cannot add, update or change status (B4)', ...)  // ทั้ง 3 endpoint → 403
test('unknown shop is 404', ...)
test('update uses the shared field names and keeps image when omitted (B2, B3)', async () => {
  // PUT ด้วย name/description/price โดยไม่แนบ image → 200, ค่าใหม่ถูกบันทึก, imageUrl เดิม
})
test('status toggles and rejects unknown values', ...)               // 'available' → 200; 'sold-out' → 400
test('shop detail reflects product changes', ...)
```

- [ ] **Step 2: รันให้เห็นว่า fail**

Run: `pnpm test -- products`
Expected: FAIL

- [ ] **Step 3: Implement**

service ดึงร้านเจ้าของสินค้าก่อน แล้วเรียก `getManageableShop(user, product.shopId)` ถ้าไม่พบสินค้าให้ throw `NotFoundError`

- [ ] **Step 4: รัน test**

Run: `pnpm test`
Expected: PASS ทั้งหมด

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(api): add products module with ownership checks (fixes B2, B4)"
```

---

### Task 8: Cart module

**Files:**
- Create:
  - `packages/shared/src/schemas/cart.ts`, `packages/shared/src/schemas/cart.test.ts`
  - `apps/api/src/modules/cart/cart.{routes,controller,service,repository,mapper}.ts`
  - `apps/api/tests/cart.test.ts`
- Modify: `app.ts`, `tests/helpers/factories.ts`

**Interfaces:**
- Consumes: `findProductsForCart` (Task 7)
- Produces (shared):
  - `replaceCartItemsSchema = { items: z.array({ productId: int positive, quantity: int 1..99 }) }` + refine ว่า productId ห้ามซ้ำ (issue ที่ path `['items']`)
  - `updateCartItemSchema = { quantity: int 1..99 }`
  - `cartQuerySchema = { shopId?: z.coerce.number().int().positive() }`
  - `cartItemSchema`, `cartSchema` ตามข้อ 8.2 ของ spec
  - type `Cart`, `CartItem`, `ReplaceCartItemsInput`
- Produces (`cart.service.ts`):
  - `listCarts(userId, shopId?): Promise<Cart[]>`
  - `replaceCartItems(userId, shopId, items): Promise<Cart | null>` (ได้ `null` เมื่อ items ว่าง)
  - `updateCartItem(userId, itemId, quantity): Promise<CartItem>`
  - `removeCartItem(userId, itemId): Promise<void>`
  - `findOwnedCartForCheckout(userId: number, cartId: number, tx: Tx): Promise<{ id: number; shopId: number; items: { productId: number; quantity: number; price: number; status: ProductStatus }[] } | null>` ล็อกแถวด้วย `FOR UPDATE` (Task 9 ใช้)
  - `deleteCart(cartId: number, tx: Tx): Promise<void>` (Task 9 ใช้)
- Produces (factories): `addToCart(token: string, shopId: number, items: { productId: number; quantity: number }[]): Promise<Cart>` (เรียกผ่าน API)
- **การคำนวณเงิน:** `subtotal = price * quantity` และ `totalPrice = Σ subtotal` ปัดเป็นทศนิยม 2 ตำแหน่ง

- [ ] **Step 1: เขียน test ที่ต้อง fail**

```ts
// packages/shared/src/schemas/cart.test.ts
test('rejects duplicate productIds', () => {
  const r = replaceCartItemsSchema.safeParse({ items: [{ productId: 1, quantity: 1 }, { productId: 1, quantity: 2 }] })
  expect(r.success).toBe(false)
})

// apps/api/tests/cart.test.ts
test('replace creates a cart with totals', async () => {
  // สินค้า a ราคา 50 x2 และ b ราคา 55 x1
  const cart = await addToCart(token, shop.id, [{ productId: a.id, quantity: 2 }, { productId: b.id, quantity: 1 }])
  expect(cart.items.map((i) => i.subtotal)).toEqual([100, 55])
  expect(cart.totalPrice).toBe(155)
})
test('replace overwrites previous items; empty list deletes the cart (204)', ...)
test('rejects products from another shop, unavailable or unknown products (400)', ...)
test('duplicate productId is a 400, not a 500', ...)
test('GET ?shopId filters to that shop', ...)
test('PATCH quantity updates subtotal; quantity 0 is 400 (B6)', ...)
test("cannot touch another user's cart item: PATCH/DELETE → 404 (B6)", ...)
test('deleting the last item removes the cart; DELETE returns empty 204 (B7)', async () => {
  const res = await api().delete(`/api/cart/items/${itemId}`).set(auth(token))
  expect(res.status).toBe(204)
  expect(res.text).toBe('')
  expect((await api().get('/api/cart').set(auth(token))).body).toEqual([])
})
test('requires authentication', ...)
```

- [ ] **Step 2: รันให้เห็นว่า fail**

Run: `pnpm test -- cart`
Expected: FAIL

- [ ] **Step 3: Implement**

`replaceCartItems` ทำทั้งหมดใน `withTransaction`:
1. ตรวจสินค้าด้วย `findProductsForCart` จำนวนที่ได้ต้องเท่ากับที่ส่งมา และทุกชิ้นต้องเป็น `available` ไม่งั้น throw `ValidationError` ที่ path `items`
2. upsert cart
3. ลบ items เดิม
4. insert items ใหม่

- [ ] **Step 4: รัน test**

Run: `pnpm test`
Expected: PASS ทั้งหมด

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(api): add cart module with ownership and quantity rules (fixes B6, B7)"
```

---

### Task 9: Orders module

**Files:**
- Create:
  - `packages/shared/src/schemas/order.ts`
  - `apps/api/src/modules/orders/orders.{routes,controller,service,repository,mapper}.ts`
  - `apps/api/tests/orders.test.ts`
- Modify: `app.ts` (mount `/api/shops/mine/orders` **ก่อน** shops router), `tests/helpers/factories.ts`

**Interfaces:**
- Consumes: `findOwnedCartForCheckout`, `deleteCart` (Task 8), `getManageableShop` (Task 6)
- Produces (shared):
  - `checkoutSchema = { cartId: int positive }`
  - `updateOrderStatusSchema = { status: z.enum(ORDER_STATUSES) }`
  - `updateOrderItemSchema = { isDone: z.boolean() }`
  - `orderItemSchema`, `orderSchema`, `shopOrderSchema`, `orderListSchema = { waiting: Order[], finished: Order[] }`, `shopOrderListSchema`
  - type `Order`, `ShopOrder`, `OrderItem`
- Produces (`orders.service.ts`):
  - `checkout(userId, cartId): Promise<Order>`
  - `listMyOrders(userId): Promise<{ waiting: Order[]; finished: Order[] }>`
  - `listShopOrders(user): Promise<{ waiting: ShopOrder[]; finished: ShopOrder[] }>` ถ้า user ไม่มีร้านให้ throw `NotFoundError`
  - `setOrderStatus(user, orderId, status): Promise<ShopOrder>`
  - `setOrderItemDone(user, itemId, isDone): Promise<OrderItem>`
- Produces (factories): `createOrder(customerId: number, shopId: number, items: { productId: number; quantity: number; unitPrice: number }[], opts?: { status?: OrderStatus; createdAt?: Date; finishedAt?: Date | null }): Promise<{ id: number }>` (insert ตรงเข้า DB ใช้ควบคุมลำดับเวลาใน test)
- Routes:
  - `POST /api/orders`
  - `GET /api/orders/mine`
  - `GET /api/shops/mine/orders` (`requireRole('merchant','admin')`)
  - `PATCH /api/orders/:id/status`
  - `PATCH /api/order-items/:id`

- [ ] **Step 1: เขียน test ที่ต้อง fail**

```ts
// apps/api/tests/orders.test.ts
test('checkout creates an order with price snapshot and removes the cart', async () => {
  const res = await api().post('/api/orders').set(auth(customerToken)).send({ cartId: cart.id })
  expect(res.status).toBe(201)
  expect(res.body).toMatchObject({ status: 'waiting', totalPrice: 155, finishedAt: null })
  expect(res.body.items[0]).toMatchObject({ unitPrice: 50, quantity: 2, isDone: false })
  expect((await api().get('/api/cart').set(auth(customerToken))).body).toEqual([])
})
test('order history keeps the price paid after the shop changes prices (B13)', ...)
test("checkout with someone else's or an unknown cart is 404 (B5)", ...)
test('checking out the same cart twice yields 404 and a single order', async () => {
  // ยิง POST เดิมสองครั้ง → 201 แล้ว 404 และมีแถวในตาราง orders แค่ 1 แถว
})
test('checkout fails with 400 when a product became unavailable, cart kept', ...)
test('checkout of a cart with no items is 400', ...)              // insert cart เปล่าตรงเข้า DB
test('my orders: waiting oldest first, finished newest first; only my own', ...)
test('shop orders include customer contact; only own shop', async () => {
  // ได้ body.waiting[0].customer เท่ากับ { id, firstName, mobile } ของลูกค้า
  // และไม่มีออเดอร์ของร้านอื่นปนมา
})
test('merchant without a shop gets 404; customer gets 403', ...)
test('finishing sets finishedAt; reopening clears it', ...)       // finishedAt เป็น ISO string แล้วกลับเป็น null
test('other merchant cannot change status or items (B4)', ...)
test('toggling an item persists isDone (B10)', async () => {
  const res = await api().patch(`/api/order-items/${itemId}`).set(auth(merchantToken)).send({ isDone: true })
  expect(res.body.isDone).toBe(true)
})
```

- [ ] **Step 2: รันให้เห็นว่า fail**

Run: `pnpm test -- orders`
Expected: FAIL

- [ ] **Step 3: Implement**

ลำดับใน `checkout` ซึ่งอยู่ใน `withTransaction` ทั้งหมด:
1. `findOwnedCartForCheckout` ถ้าได้ `null` ให้ throw `NotFoundError`
2. ถ้า items ว่าง หรือมีชิ้นที่ไม่ `available` ให้ throw `ValidationError` ที่ path `cartId`
3. insert order และ order_items โดยเก็บ `unit_price` จากราคาปัจจุบัน
4. `deleteCart`
5. อ่าน order ที่สร้างแล้วส่งกลับ

- [ ] **Step 4: รัน test**

Run: `pnpm test`
Expected: PASS ทั้งหมด

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(api): add orders module with checkout snapshot (fixes B4, B5, B10, B13)"
```

---

### Task 10: Seed และ reset

**Files:**
- Create: `apps/api/src/db/{seed-data.ts,seed.ts,reset.ts}`, `apps/api/tests/db/seed.test.ts`

**Interfaces:**
- Produces:
  - `seed(): Promise<{ skipped: boolean }>` ข้ามถ้ามีผู้ใช้ `merchant1` อยู่แล้ว ถ้าไม่มีให้ copy รูปจาก `env.SEED_IMAGES_DIR` ไป `env.UPLOAD_DIR` แล้ว insert ข้อมูลทั้งหมดใน transaction เดียว
  - `resetDatabase(): Promise<void>` ทำตามลำดับนี้:
    1. log host และชื่อ DB
    2. `DROP TABLE` ทุกตาราง รวม `__drizzle_migrations` (ปิด FK check ระหว่างทำ)
    3. `runMigrations()`
    4. `seed()`
- **CLI:** เมื่อรัน `seed.ts` หรือ `reset.ts` โดยตรง ให้เรียกฟังก์ชันแล้ว `closeDb()`
- **ข้อมูลใน `seed-data.ts`:**
  - **ผู้ใช้:**
    - `merchant1`–`merchant5`: firstName `Merchant`, lastName `One`..`Five`, email `merchantN@example.com`, mobile `080000000N`, role `merchant`
    - `customer1`: firstName `Customer`, lastName `One`, email `customer1@example.com`, mobile `0900000001`, role `customer`
    - รหัสผ่านทุกคน `Password123`
  - **ร้าน** (ร้านที่ N เป็นของ `merchantN` และใช้รูป `shop-N.*`):

| # | name | description |
|---|---|---|
| 1 | ร้านก๋วยเตี๋ยวโรงอาหาร | ร้านก๋วยเตี๋ยวโรงอาหาร ราคาถูก อร่อย สูตรโบราณ |
| 2 | ร้านอาหารตามสั่ง | ร้านอาหารตามสั่ง ป้าสั่งได้ ข้าวผัด กระเพรา ข้าวแกง |
| 3 | Drink Shop | ร้านเครื่องดื่ม ขนม นม เนย |
| 4 | ข้าวผัดซู่ซ่า | ร้านข้าวผัด ผัดข้าว ผัดซู่ซ่า |
| 5 | ร้านลูกชิ้นลุง | ลูกชิ้นทอด ไก่ทอด ข้าวเหนียวหมูทอด ลุงขายหมด |

  - **สินค้า** (ใช้รูป `product-N.*`):

| # | ร้าน | name | description | price | status |
|---|---|---|---|---|---|
| 1 | 1 | ก๋วยเตี๋ยวต้มยำ | ก๋วยเตี๋ยวต้มยำน้ำข้น มีหมูเด้ง หมูสับ | 50 | available |
| 2 | 1 | ก๋วยเตี๋ยวต้มน้ำตก | ก๋วยเตี๋ยวน้ำตก เนื้อ หมู | 55 | available |
| 3 | 1 | ก๋วยเตี๋ยวแห้ง | ก๋วยเตี๋ยวแห้ง เส้นเล็ก เส้นหมี่ วุ้นเส้น | 50 | not-available |
| 4 | 2 | ผัดกระเพรา | ผัดกระเพราหมูสับ | 40 | available |
| 5 | 2 | ข้าวผัด | ข้าวผัดโบราณ | 40 | available |

- [ ] **Step 1: เขียน test ที่ต้อง fail**

```ts
// apps/api/tests/db/seed.test.ts
test('seeds demo data and images', async () => {
  expect(await seed()).toEqual({ skipped: false })
  expect(await count(users)).toBe(6)
  expect(await count(shops)).toBe(5)
  expect(await count(products)).toBe(5)
  for (const s of await db.select().from(shops)) expect(fs.existsSync(path.join(env.UPLOAD_DIR, s.imageFilename!))).toBe(true)
})
test('demo merchant can log in and owns shop 1', async () => {
  await seed()
  const token = await loginAs({ username: 'merchant1', password: 'Password123' })
  const me = await api().get('/api/auth/me').set(auth(token))
  expect((await api().get(`/api/shops/${me.body.shopId}`)).body.name).toBe('ร้านก๋วยเตี๋ยวโรงอาหาร')
})
test('seed is idempotent', async () => {
  await seed()
  expect(await seed()).toEqual({ skipped: true })
  expect(await count(users)).toBe(6)
})
```

- [ ] **Step 2: รันให้เห็นว่า fail**

Run: `pnpm test -- seed`
Expected: FAIL

- [ ] **Step 3: Implement `seed-data.ts`, `seed.ts`, `reset.ts`**

- [ ] **Step 4: รัน test และลองใช้กับ DB dev จริง**

Run: `pnpm test` แล้ว `cp apps/api/.env.example apps/api/.env && pnpm db:reset`
Expected:
- test ผ่านทั้งหมด
- `db:reset` แสดง `localhost:3307/canteen` แล้วจบโดยไม่มี error

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(api): add idempotent demo seed and db reset script"
```

---

### Task 11: OpenAPI และ Swagger UI

**Files:**
- Create: `apps/api/src/docs/openapi.ts`, `apps/api/tests/docs.test.ts`
- Modify: `app.ts`, `packages/shared/src/index.ts` (ถ้า zod-to-openapi 9 ต้องเรียก `extendZodWithOpenApi(z)` ให้เรียกที่นี่ที่เดียว อ่าน README ของ v9 ก่อนเขียน)

**Interfaces:**
- Produces:
  - `buildOpenApiDocument(): OpenAPIObject` (OpenAPI 3.1, `info.title: 'Canteen Ordering API'`)
  - security scheme `bearerAuth`
  - ทุก path ในข้อ 8.3 ของ spec ลงทะเบียนด้วย request และ response schema จาก shared
  - error ทุกตัวใช้ `errorResponseSchema`
- Routes:
  - `GET /api/openapi.json`
  - `GET /api/docs` (`swagger-ui-express`) mount **ก่อน** `helmet()` หรือตั้ง CSP เฉพาะ path นี้ ไม่งั้นหน้า Swagger UI จะไม่แสดงผล

- [ ] **Step 1: เขียน test ที่ต้อง fail**

```ts
// apps/api/tests/docs.test.ts
const expected = ['/api/health','/api/auth/signup','/api/auth/login','/api/auth/logout','/api/auth/me',
  '/api/shops','/api/shops/{id}','/api/shops/{shopId}/products','/api/products/{id}','/api/products/{id}/status',
  '/api/cart','/api/cart/shops/{shopId}/items','/api/cart/items/{id}',
  '/api/orders','/api/orders/mine','/api/shops/mine/orders','/api/orders/{id}/status','/api/order-items/{id}']
test('documents every endpoint', async () => {
  const res = await api().get('/api/openapi.json')
  expect(Object.keys(res.body.paths).sort()).toEqual([...expected].sort())
  expect(res.body.components.securitySchemes.bearerAuth.scheme).toBe('bearer')
})
test('serves Swagger UI', async () => {
  const res = await api().get('/api/docs/')
  expect(res.status).toBe(200)
  expect(res.headers['content-type']).toMatch(/text\/html/)
})
```

- [ ] **Step 2: รันให้เห็นว่า fail**

Run: `pnpm test -- docs`
Expected: FAIL

- [ ] **Step 3: Implement `openapi.ts` และ mount routes**

- [ ] **Step 4: รัน test และเปิดดูหน้า docs**

Run: `pnpm test` แล้ว `pnpm dev` และเปิด `http://localhost:3000/api/docs` ในเบราว์เซอร์
Expected:
- test ผ่านทั้งหมด
- หน้า Swagger แสดงครบ 5 กลุ่ม
- กด "Try it out" ที่ `GET /api/shops` แล้วได้ร้าน 5 ร้าน

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(api): generate OpenAPI docs from shared zod schemas"
```

---

### Task 12: Docker image ของ API

**Files:**
- Create: `apps/api/Dockerfile`, `apps/api/.dockerignore`, `apps/api/tsup.config.ts`
- Modify: `docker-compose.yml` (เพิ่ม service `api`)

**Interfaces:**
- **tsup:**
  - entry `src/server.ts`, `src/db/migrate.ts`, `src/db/seed.ts`
  - `format: esm`, `target: node24`
  - `noExternal: ['@canteen/shared']`
  - output ไปที่ `dist/`
- **Dockerfile:**
  - build context = root ของ repo
  - stage `build` (`node:24-slim` เพราะ bcrypt เป็น native module ใช้ glibc เลี่ยงปัญหา musl): corepack → `pnpm install --frozen-lockfile` → `pnpm --filter @canteen/api build` → `pnpm --filter @canteen/api deploy --prod /out`
  - stage `runtime` (`node:24-slim`): copy `/out`, `dist`, `src/db/migrations` ไปที่ `/app/migrations`, `seed/images` ไปที่ `/app/seed/images`
  - `USER node`
  - CMD: `node dist/migrate.js && node dist/seed.js && node dist/server.js`
- **compose service `api`:**
  - `build: { context: ., dockerfile: apps/api/Dockerfile }`
  - env:
    - `NODE_ENV=production`
    - `DATABASE_URL=mysql://canteen:canteen@db:3306/canteen`
    - `MIGRATIONS_DIR=/app/migrations`
    - `SEED_IMAGES_DIR=/app/seed/images`
    - `UPLOAD_DIR=/app/uploads`
    - `CORS_ORIGINS=http://localhost:5173`
  - `depends_on: db: condition: service_healthy`
  - ports `3000:3000`
  - volume `uploads:/app/uploads`
  - healthcheck: `node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"`

- [ ] **Step 1: Build และรัน**

Run: `docker compose up -d --build && docker compose ps`
Expected: ทั้ง `db` และ `api` มีสถานะ `healthy`

- [ ] **Step 2: ตรวจผลลัพธ์**

```bash
curl -s localhost:3000/api/shops | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const a=JSON.parse(s);console.log(a.length, a[0].imageUrl)})"
curl -s -o /dev/null -w "%{http_code}\n" "localhost:3000$(curl -s localhost:3000/api/shops | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s)[0].imageUrl))")"
docker compose restart api && sleep 5 && curl -s localhost:3000/api/shops | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).length))"
```
Expected:
- คำสั่งแรกได้ `5 /uploads/<uuid>.jpg`
- คำสั่งที่สอง (โหลดรูป) ได้ `200`
- หลัง restart ยังได้ `5` (seed ไม่สร้างข้อมูลซ้ำ)

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(api): add production docker image and compose service"
```

---

### Task 13: CI, ตรวจรับ และ quick start

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `README.md` (เพิ่มหัวข้อ "Development (v2 – in progress)" ใต้เนื้อหาเดิม)

**Interfaces:**
- **CI:**
  - `on: [push, pull_request]`
  - job `ci` บน `ubuntu-latest`
  - services `mysql:8.4`:
    - env `MYSQL_ROOT_PASSWORD=root`, `MYSQL_DATABASE=canteen_test`, `MYSQL_USER=canteen`, `MYSQL_PASSWORD=canteen`
    - ports `3307:3306`
    - options health-cmd `mysqladmin ping`
  - steps: checkout → `actions/setup-node` (node-version-file `.nvmrc`) → `corepack enable` → `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm typecheck` → `pnpm test`
- **README:** อธิบายการรันสองแบบ
  - (1) `docker compose up`
  - (2) dev: `corepack enable` → `pnpm install` → `docker compose up -d db` → `cp apps/api/.env.example apps/api/.env` → `pnpm db:reset` → `pnpm dev`
  - พร้อมบัญชี demo และลิงก์ `/api/docs`

- [ ] **Step 1: เขียน `ci.yml` และหัวข้อใน README**

- [ ] **Step 2: ตรวจตามเกณฑ์ตรวจรับในข้อ 17 ของ spec**

```bash
pnpm lint && pnpm typecheck && pnpm test
grep -rnE "db\.(select|insert|update|delete|execute)|\.execute\(|sql\`" apps/api/src --include=*.ts | grep -vE "\.repository\.ts:|src/db/"
grep -rnwE "req|res" apps/api/src/modules/*/*.service.ts apps/api/src/modules/*/*.repository.ts
grep -rn "any" apps/api/src packages/shared/src --include=*.ts | grep -E ":\s*any\b|<any>|as any"
ls .backups/
```
Expected:
- lint, typecheck และ test ผ่าน
- grep ทั้ง 3 คำสั่งไม่มีผลลัพธ์
- `.backups/` มีไฟล์ `webproproject-2026-10-22.sql`

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "ci: add GitHub Actions pipeline and dev quick start"
```

- [ ] **Step 4: รายงานให้เจ้าของ repo ทราบ**

CI จะรันจริงก็ต่อเมื่อ push ขึ้น GitHub ซึ่ง**ต้องขออนุญาตก่อน** ให้แจ้งเจ้าของ repo ว่าพร้อม push branch `refactor/architecture` เพื่อยืนยันเกณฑ์ข้อ 1 ในส่วนที่ต้องรันบน CI
