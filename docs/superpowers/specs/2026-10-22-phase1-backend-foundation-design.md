# Spec เฟส 1: Backend Foundation

- **วันที่:** 2026-10-22
- **สถานะ:** รอ review
- **Branch:** `refactor/architecture`
- **Roadmap:** `2026-10-22-roadmap.md`
- **แทนที่:** `2026-10-22-backend-refactor-design.md` (ฉบับ JavaScript เดิม)

---

## 1. เป้าหมาย

เขียน backend ใหม่ใน monorepo ด้วย Express 5 + TypeScript + Drizzle ให้ได้:
- โครงสร้างตามฟีเจอร์ที่แบ่ง layer ชัดเจน
- API แบบ REST ที่มี contract ร่วมกับ frontend ผ่าน `packages/shared`
- Migration ที่เก็บประวัติการเปลี่ยน schema ไว้ใน git
- Test ระดับ API ที่ครอบคลุม
- Docker Compose, CI และเอกสาร Swagger

**ฟีเจอร์ต้องเท่าเดิม** (ร้าน, สินค้า, ตะกร้า, คิว, auth) แต่แก้บั๊ก B1–B15 ทั้งหมด

**เกณฑ์ความสำเร็จ:** clone repo แล้วสั่ง `docker compose up` ได้ API ที่มีข้อมูล demo พร้อมใช้ ทุก endpoint มี test และ CI ผ่าน คนที่เปิด `apps/api/src/modules/` เข้าใจได้ทันทีว่าแต่ละฟีเจอร์อยู่ที่ไหน

## 2. ขอบเขต

**ทำในเฟสนี้**
- ตั้ง monorepo: pnpm workspaces, tsconfig / ESLint / Prettier กลาง
- `packages/shared`: Zod schema ของ request และ response, ค่าคงที่ (role, สถานะต่างๆ)
- `apps/api`: ทุก endpoint ในข้อ 8 พร้อม test
- Drizzle schema + migration `0000_initial` + seed
- Docker Compose (MySQL + API), GitHub Actions CI, Swagger UI
- ลบ backend JS เดิม

**ไม่ทำในเฟสนี้**
- Frontend: `myfrontend/` จะใช้งานไม่ได้บน branch นี้จนกว่าเฟส 2 จะเสร็จ
- สถานะออเดอร์แบบใหม่และ Socket.IO (เฟส 3)
- Deploy (เฟส 4)
- ฟีเจอร์ใหม่ เช่น ลบร้าน, ลบสินค้า, profile
- เปลี่ยนไปใช้ JWT

## 3. เครื่องมือและเวอร์ชัน

| เรื่อง | เลือก |
|---|---|
| Runtime | Node.js 22 LTS |
| Package manager | pnpm (เปิดผ่าน corepack และกำหนดไว้ใน `packageManager` ของ root) |
| ภาษา | TypeScript strict, ESM |
| รันตอน dev | `tsx watch` |
| Build ตอน production | `tsup` bundle `apps/api` รวม `@canteen/shared` เป็นไฟล์ JS ไฟล์เดียว |
| Web framework | Express 5 |
| ORM / migration | `drizzle-orm` + `drizzle-kit` (dialect MySQL, driver `mysql2`) |
| Validation | Zod |
| OpenAPI | `@asteasolutions/zod-to-openapi` + `swagger-ui-express` |
| Upload | multer 2.x |
| Security | `helmet`, `express-rate-limit` (เฉพาะ `/api/auth/login`), `bcrypt` cost 10 |
| Logging | `pino-http` (ปิดตอนรัน test) |
| Test | Vitest + supertest |
| Lint / format | ESLint (flat config + typescript-eslint) + Prettier (`singleQuote`, `semi: false`, `printWidth: 100`) |

ตอนเขียน implementation plan จะ pin เวอร์ชันของ library เป็นเวอร์ชัน stable ล่าสุดที่ปล่อยมาแล้ว

## 4. โครงสร้าง repo

```
(root)
├── package.json               # scripts รวม + packageManager
├── pnpm-workspace.yaml        # apps/*, packages/*
├── tsconfig.base.json
├── eslint.config.js
├── .prettierrc
├── docker-compose.yml
├── .env.example               # ค่าที่ docker compose ใช้
├── .github/workflows/ci.yml
├── apps/
│   └── api/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       ├── drizzle.config.ts
│       ├── vitest.config.ts
│       ├── Dockerfile
│       ├── .env.example
│       ├── seed/images/       # รูปของข้อมูล demo (track ใน git)
│       ├── uploads/           # ไฟล์ที่ผู้ใช้อัปโหลด (gitignored เหลือแค่ .gitkeep)
│       ├── tests/
│       │   ├── setup/         # global setup: migrate test DB
│       │   ├── helpers/       # factories: createUser, loginAs, createShop, createProduct, ...
│       │   └── *.test.ts
│       └── src/               # ดูข้อ 5
├── packages/
│   └── shared/
│       ├── package.json       # name: @canteen/shared, exports: ./src/index.ts
│       └── src/
│           ├── index.ts
│           ├── constants.ts   # ROLES, PRODUCT_STATUS, ORDER_STATUS
│           └── schemas/       # auth.ts, shop.ts, product.ts, cart.ts, order.ts, common.ts
├── myfrontend/                # Vue 2 เดิม เก็บไว้เป็นต้นแบบ (ลบในเฟส 2)
└── docs/
```

- **`packages/shared`:** เป็น internal package ที่ใช้ไฟล์ TS ตรงๆ ไม่มีขั้น build ฝั่ง API เรียกใช้ผ่าน `tsx` ตอน dev และ `tsup` จะ bundle รวมเข้าไปตอน build
- **การย้ายโฟลเดอร์:** `backend/` ย้ายเป็น `apps/api/` ด้วย `git mv` เพื่อเก็บประวัติ แล้วเขียนเนื้อหาใหม่เป็น TypeScript

## 5. โครงสร้าง `apps/api/src`

```
src/
├── server.ts                  # start HTTP server + graceful shutdown
├── app.ts                     # createApp(): ประกอบ middleware และ router (ไม่ listen เพื่อให้ test ใช้ได้)
├── config/
│   └── env.ts                 # parse process.env ด้วย Zod ถ้าผิดหรือขาดจะ throw ตอน start
├── db/
│   ├── schema.ts              # Drizzle table definitions
│   ├── client.ts              # db instance + withTransaction()
│   ├── migrations/            # ไฟล์ SQL จาก drizzle-kit (commit ลง git ห้ามแก้ด้วยมือ)
│   ├── migrate.ts             # pnpm db:migrate
│   ├── seed.ts                # pnpm db:seed
│   └── reset.ts               # pnpm db:reset (drop → migrate → seed)
├── common/
│   ├── errors.ts              # AppError + subclass
│   ├── http.ts                # ตัวช่วยแปลง row เป็น response เช่น toImageUrl()
│   ├── middlewares/
│   │   ├── requireAuth.ts
│   │   ├── requireRole.ts
│   │   ├── validate.ts        # validate({ body, query, params }) ด้วย Zod schema
│   │   ├── upload.ts
│   │   ├── notFound.ts
│   │   └── errorHandler.ts
│   └── policies/
│       └── shopPolicy.ts      # canManageShop(user, shop)
├── docs/
│   └── openapi.ts             # registry + สร้าง document จาก schema ใน shared
└── modules/
    ├── health/   health.routes.ts
    ├── auth/     auth.routes.ts, auth.controller.ts, auth.service.ts, auth.repository.ts, token.ts
    ├── shops/    shops.routes.ts, shops.controller.ts, shops.service.ts, shops.repository.ts
    ├── products/ products.routes.ts, products.controller.ts, products.service.ts, products.repository.ts
    ├── cart/     cart.routes.ts, cart.controller.ts, cart.service.ts, cart.repository.ts
    └── orders/   orders.routes.ts, orders.controller.ts, orders.service.ts, orders.repository.ts
```

### กฎของแต่ละ layer

| Layer | ทำอะไร | ห้ามทำ |
|---|---|---|
| `*.routes.ts` | จับคู่ method + path → middleware (`requireAuth`, `validate`, `upload`) → controller | มี logic |
| `*.controller.ts` | ดึงค่าที่ validate แล้วจาก `req` → เรียก service → `res.status().json()` | query DB หรือตัดสินใจทาง business |
| `*.service.ts` | business rule, เช็คสิทธิ์ผ่าน policy, จัดการ transaction, throw `AppError` | แตะ `req` / `res` |
| `*.repository.ts` | query ผ่าน Drizzle รับ `tx` ที่ไม่บังคับ คืนค่าเป็น plain object | เช็คสิทธิ์หรือ throw HTTP error |
| `policies/` | pure function ตัดสินสิทธิ์ | query DB |

- **การเรียกข้าม module:** service เรียก **service** ของ module อื่นได้ (เช่น `orders.service` เรียก `cart.service`) แต่ห้าม import repository ของ module อื่น
- **Dependency:** ใช้ ES module import ตรงๆ ไม่ใช้ DI container ส่วนการ mock ใน unit test ใช้ `vi.mock`

## 6. Database

### 6.1 Schema (`0000_initial`)

Naming:
- **ใน DB:** ชื่อตารางและคอลัมน์เป็น snake_case
- **ใน TypeScript:** เป็น camelCase (ใช้ `casing: 'snake_case'` ของ Drizzle)
- **ทุกตาราง:** มี `id` แบบ INT AUTO_INCREMENT

| ตาราง | คอลัมน์ | Constraint / หมายเหตุ |
|---|---|---|
| `users` | id, username, password_hash, first_name, last_name, email, mobile, role, created_at | `username` UNIQUE; `role` ENUM(`customer`, `merchant`, `admin`) |
| `auth_tokens` | id, user_id, token_hash, created_at | `token_hash` CHAR(64) UNIQUE เก็บ SHA-256 ของ token ไม่เก็บ token จริง; FK user CASCADE |
| `shops` | id, owner_id, name, description, image_filename, created_at | `owner_id` **UNIQUE** (1 merchant มีได้ 1 ร้าน); FK user CASCADE |
| `products` | id, shop_id, name, description, price, image_filename, status, created_at, updated_at | `price` DECIMAL(10,2); `status` ENUM(`available`, `not-available`) DEFAULT `not-available`; FK shop CASCADE |
| `carts` | id, user_id, shop_id, created_at, updated_at | UNIQUE(`user_id`, `shop_id`); FK CASCADE |
| `cart_items` | id, cart_id, product_id, quantity, created_at, updated_at | UNIQUE(`cart_id`, `product_id`); CHECK(`quantity` >= 1); FK CASCADE |
| `orders` | id, customer_id, shop_id, status, created_at, finished_at | `status` ENUM(`waiting`, `finished`) DEFAULT `waiting`; FK CASCADE |
| `order_items` | id, order_id, product_id, quantity, unit_price, is_done | `unit_price` DECIMAL(10,2) ราคา ณ ตอนสั่ง; `is_done` BOOLEAN DEFAULT FALSE; FK order CASCADE, product RESTRICT |

การเปลี่ยนชื่อจากของเดิม:

| เดิม | ใหม่ |
|---|---|
| `queues` | `orders` |
| `queue_items` | `order_items` |
| `tokens` | `auth_tokens` |
| `create_by_id` | `owner_id` |
| `orders.user_id` | `customer_id` |
| `picture` | `image_filename` |
| `password` | `password_hash` |

- **ข้อความบนหน้าจอ:** ยังเรียกว่า "คิว" ได้ตามเดิม
- **สถานะออเดอร์:** คงไว้เป็น `waiting` / `finished` ในเฟสนี้ เพื่อให้ฟีเจอร์เท่าเดิม เฟส 3 จะเปลี่ยนผ่าน migration `0001_order_status_flow`

### 6.2 Workflow ของ migration

| ขั้น | คำสั่ง |
|---|---|
| แก้ schema | แก้ไฟล์ `schema.ts` |
| สร้างไฟล์ migration | `pnpm db:generate` (drizzle-kit สร้างไฟล์ SQL ให้ ต้อง review แล้ว commit) |
| นำไปใช้กับ DB | `pnpm db:migrate` |
| ใส่ข้อมูล demo | `pnpm db:seed` |
| ล้าง DB สำหรับ dev | `pnpm db:reset` (แสดงชื่อ DB และ host ก่อนเริ่มเสมอ) |

- **ห้าม:** ใช้ `drizzle-kit push` และห้ามแก้ไฟล์ migration ที่ commit ไปแล้ว ถ้าต้องเปลี่ยนให้สร้างไฟล์ใหม่
- **ตอน API container start:** รัน `db:migrate` ก่อนทุกครั้ง

### 6.3 Seed
- **ผู้ใช้:** `merchant1`–`merchant5` (เจ้าของร้านละคน) และ `customer1` รหัสผ่านทุกบัญชีคือ `Password123`
- **ร้านและสินค้า:** ร้าน 5 ร้านกับสินค้า 5 รายการ ชื่อ คำอธิบาย ราคา และสถานะเหมือนข้อมูลปัจจุบัน
- **รูป:** ย้ายรูปที่ใช้จริงจาก `backend/static/uploads/` ไปไว้ที่ `apps/api/seed/images/` แล้ว seed จะ copy เข้า `UPLOAD_DIR`
- **Idempotent:** ถ้ามีผู้ใช้ `merchant1` อยู่แล้ว seed จะข้ามไป

### 6.4 DB เดิมในเครื่อง
- **ไม่แตะเลย:** MySQL ใน Docker ใช้ port **3307** จึงไม่ชนกับ MySQL93 ที่ port 3306
- **Backup อีกชั้น:** ก่อนเริ่มจะ dump DB `webproproject` เดิมเก็บไว้ที่ `.backups/` (gitignored)

## 7. Uploads
- **ประเภทไฟล์:** รับเฉพาะ `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `image/gif`
- **ขนาด:** ไม่เกิน `UPLOAD_MAX_MB` (default 5)
- **field ของ multipart:** ชื่อ `image` ทุก endpoint
- **ชื่อไฟล์:** `crypto.randomUUID() + นามสกุลไฟล์` และ DB เก็บแค่ชื่อไฟล์ (ใน `image_filename`)
- **การ serve:** `GET /uploads/<filename>` ผ่าน `express.static`
- **ใน response:** ส่งเป็น `imageUrl: "/uploads/<filename>"` (path ที่สัมพันธ์กับ origin ของ API) หรือ `null`
- **ไฟล์ค้าง:** ถ้า request พังหลัง multer บันทึกไฟล์แล้ว (เช่น validation ไม่ผ่าน) ให้ลบไฟล์นั้นทิ้ง
- **ตอนรัน test:** ใช้โฟลเดอร์ชั่วคราว

## 8. API

### 8.1 หลักทั่วไป
- **Prefix:** ทุก endpoint ขึ้นต้นด้วย `/api` ยกเว้น `/uploads/*`
- **ชื่อ field ใน JSON:** camelCase
- **Success:** ส่งข้อมูลตรงๆ ไม่มี wrapper
- **ราคา:** ส่งเป็น number
- **เวลา:** ส่งเป็น ISO 8601
- **Schema:** request และ response ทุกตัวนิยามด้วย Zod ใน `packages/shared/src/schemas/` แล้ว export type ด้วย `z.infer`
- **multipart:** field ตัวเลขใช้ `z.coerce.number()`

### 8.2 Types (จาก `@canteen/shared`)
```ts
User      = { id, username, firstName, lastName, email, mobile, role, shopId: number | null }
Shop      = { id, ownerId, name, description, imageUrl, createdAt }
Product   = { id, shopId, name, description, price, imageUrl, status }
Cart      = { id, shop: { id, name, imageUrl }, items: CartItem[], totalPrice }
CartItem  = { id, productId, name, imageUrl, price, quantity, subtotal }
Order     = { id, status, createdAt, finishedAt, shop: { id, name }, items: OrderItem[], totalPrice }
ShopOrder = Order & { customer: { id, firstName, mobile } }
OrderItem = { id, productId, name, imageUrl, unitPrice, quantity, isDone }
```

### 8.3 Endpoints

**Health**
| Method | Path | Auth | Success |
|---|---|---|---|
| GET | `/api/health` | – | 200 `{ status: 'ok' }` (ใช้กับ healthcheck ของ Docker และตอน deploy) |

**Auth**
| Method | Path | Auth | Body | Success |
|---|---|---|---|---|
| POST | `/api/auth/signup` | – | username, password, confirmPassword, firstName, lastName, email, mobile, role | 201 `User` |
| POST | `/api/auth/login` | – (rate limited) | username, password | 200 `{ token, user: User }` |
| POST | `/api/auth/logout` | ✔ | – | 204 |
| GET | `/api/auth/me` | ✔ | – | 200 `User` |

- **Validation:**
  - username ยาว 5–20 ตัวอักษร
  - password ยาว 8 ตัวขึ้นไป และต้องมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลข
  - confirmPassword ต้องตรงกับ password
  - email ต้องเป็นรูปแบบที่ถูกต้อง
  - mobile ต้องตรงกับ `^0[0-9]{9}$`
  - role เลือกได้แค่ `customer` / `merchant`
- **signup:** username ซ้ำตอบ 409
- **login:**
  - สร้าง token ใหม่ทุกครั้ง โดยใช้ `crypto.randomBytes(32)` แปลงเป็น hex แล้วเก็บแค่ SHA-256 ไว้ใน DB
  - ถ้า username หรือรหัสผิด ตอบ 401 ด้วยข้อความเดียวกัน
- **logout:** ลบ token ที่ใช้อยู่ออกจาก DB

**Shops และ Products**
| Method | Path | Auth | Body | Success |
|---|---|---|---|---|
| GET | `/api/shops?search=` | – | – | 200 `Shop[]` (ค้นจาก `name` เรียงตาม id) |
| GET | `/api/shops/:id` | – | – | 200 `Shop & { products: Product[] }` |
| POST | `/api/shops` | merchant / admin | multipart: name, description, image | 201 `Shop` |
| PUT | `/api/shops/:id` | เจ้าของ / admin | multipart: name, description, image (ไม่บังคับ) | 200 `Shop` |
| POST | `/api/shops/:shopId/products` | เจ้าของ / admin | multipart: name, description, price, image | 201 `Product` |
| PUT | `/api/products/:id` | เจ้าของ / admin | multipart: name, description, price, image (ไม่บังคับ) | 200 `Product` |
| PATCH | `/api/products/:id/status` | เจ้าของ / admin | `{ status }` | 200 `Product` |

- **สร้างร้าน:** ถ้ามีร้านอยู่แล้วตอบ 409 ถ้าไม่ได้แนบรูปตอบ 400
- **สินค้าใหม่:** สถานะเริ่มต้นเป็น `not-available`
- **price:** ต้องมากกว่า 0

**Cart**
| Method | Path | Auth | Body | Success |
|---|---|---|---|---|
| GET | `/api/cart?shopId=` | ✔ | – | 200 `Cart[]` |
| PUT | `/api/cart/shops/:shopId/items` | ✔ | `{ items: [{ productId, quantity }] }` | 200 `Cart` หรือ 204 ถ้า items ว่าง; 404 ถ้าไม่มีร้านนี้ (ทั้งกรณี items ว่างและไม่ว่าง) |
| PATCH | `/api/cart/items/:id` | ✔ | `{ quantity }` (≥ 1) | 200 `CartItem` |
| DELETE | `/api/cart/items/:id` | ✔ | – | 204 |

- **PUT items:** **แทนที่**ของทั้งหมดในตะกร้าของร้านนั้น
  - สินค้าทุกชิ้นต้องเป็นของร้านนั้นและมีสถานะ `available` ไม่งั้นตอบ 400
  - ถ้า items ว่าง ให้ลบตะกร้าทิ้ง
- **DELETE item:** ถ้าเป็นชิ้นสุดท้ายให้ลบตะกร้าด้วย

**Orders**
| Method | Path | Auth | Body | Success |
|---|---|---|---|---|
| POST | `/api/orders` | ✔ | `{ cartId }` | 201 `Order` |
| GET | `/api/orders/mine` | ✔ | – | 200 `{ waiting: Order[], finished: Order[] }` |
| GET | `/api/shops/mine/orders` | merchant / admin ที่มีร้าน | – | 200 `{ waiting: ShopOrder[], finished: ShopOrder[] }` |
| PATCH | `/api/orders/:id/status` | เจ้าของร้าน / admin | `{ status: 'waiting' \| 'finished' }` | 200 `ShopOrder` |
| PATCH | `/api/order-items/:id` | เจ้าของร้าน / admin | `{ isDone }` | 200 `OrderItem` |

- **Checkout (POST):**
  - ทั้งหมดอยู่ใน transaction เดียว
  - ตะกร้าต้องเป็นของผู้ใช้ (ไม่ใช่ตอบ 404) และไม่ว่าง (ว่างตอบ 400)
  - snapshot ราคาลง `unit_price` แล้วลบตะกร้า
- **เปลี่ยนสถานะเป็น `finished`:** ตั้งค่า `finished_at` ถ้าเปลี่ยนกลับเป็น `waiting` ให้ล้างค่านั้น
- **ลำดับรายการ:** `waiting` เรียงคิวเก่าก่อน ส่วน `finished` เรียงคิวใหม่ก่อน
- **คิวของร้าน:** ถ้าผู้ใช้ไม่มีร้านตอบ 404
- **การกำหนด route:** `/api/shops/mine/orders` ต้องประกาศก่อน `/api/shops/:id`

**Docs**
- `GET /api/docs`: Swagger UI
- `GET /api/openapi.json`: เอกสาร OpenAPI 3.1 ที่สร้างจาก Zod schema ทุก endpoint ในข้อ 8.3 ต้องอยู่ในเอกสารนี้

### 8.4 สิทธิ์

| การกระทำ | ใครทำได้ |
|---|---|
| ดูร้าน / สินค้า | ทุกคน (ไม่ต้อง login) |
| สร้างร้าน | `merchant` ที่ยังไม่มีร้าน, `admin` |
| แก้ร้าน, เพิ่ม / แก้ / เปลี่ยนสถานะสินค้า, จัดการออเดอร์ของร้าน | เจ้าของร้าน (`canManageShop`), `admin` |
| ตะกร้า, checkout, ดูออเดอร์ของตัวเอง | ผู้ใช้ที่ login แล้ว (เฉพาะข้อมูลของตัวเอง) |

- **ไม่มีสิทธิ์ในร้าน:** resource ของร้านที่ไม่มีสิทธิ์จัดการตอบ 403
- **ตะกร้าหรือออเดอร์ของคนอื่น:** ตอบ 404 เพื่อไม่เปิดเผยว่ามีอยู่จริง

## 9. Error handling

- **รูปแบบ:** ทุก error ตอบในรูปแบบเดียวกัน
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "ข้อความที่อ่านเข้าใจได้", "details": [{ "path": "price", "message": "..." }] } }
  ```
- **`code`:** `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500)
- **`details`:** มีเฉพาะ validation error
- **error จาก multer:** ขนาดหรือชนิดไฟล์ไม่ถูกต้องแปลงเป็น `VALIDATION_ERROR`
- **error อื่นที่ไม่ได้คาดไว้:** log ด้วย pino แล้วตอบ 500 โดยไม่ส่ง stack หรือ SQL ออกไป
- **async handler:** Express 5 ส่ง error เข้า `errorHandler` ให้เอง
- **path ที่ไม่มีอยู่:** `notFound` ตอบ 404 ในรูปแบบเดียวกัน

## 10. Config

`apps/api/.env.example`:
```
NODE_ENV=development
PORT=3000
DATABASE_URL=mysql://canteen:canteen@localhost:3307/canteen
CORS_ORIGINS=http://localhost:5173
UPLOAD_DIR=uploads
UPLOAD_MAX_MB=5
```

- **Test:** ใช้ `.env.test` ที่ชี้ไปที่ DB `canteen_test` และ test setup จะ**ไม่ยอมทำงาน**ถ้าชื่อ DB ไม่ลงท้ายด้วย `_test`
- **`CORS_ORIGINS`:** ใส่ได้หลายค่าโดยคั่นด้วย comma

## 11. Docker Compose

| Service | รายละเอียด |
|---|---|
| `db` | `mysql:8.4`, port `3307:3306`, volume `db-data`, healthcheck, init script สร้าง DB `canteen` กับ `canteen_test` และ user `canteen` |
| `api` | build จาก `apps/api/Dockerfile` (multi-stage: pnpm install → tsup build → runtime image ขนาดเล็ก), รอ `db` healthy ก่อน → `db:migrate` → `db:seed` → start, port `3000`, volume `uploads` |

- **ใช้ระบบทั้งหมด:** `docker compose up` ได้ API พร้อมข้อมูล demo
- **ระหว่างพัฒนา (แนะนำ):** สั่ง `docker compose up db` แล้วรัน `pnpm dev` ในเครื่อง

## 12. Scripts ที่ root

| Script | ทำอะไร |
|---|---|
| `pnpm dev` | รัน API ด้วย `tsx watch` (เฟส 2 จะเพิ่ม web) |
| `pnpm build` | build ทุก app |
| `pnpm test` | Vitest ทุก package |
| `pnpm lint` / `pnpm format` | ESLint / Prettier |
| `pnpm typecheck` | `tsc --noEmit` ทุก package |
| `pnpm db:generate` / `db:migrate` / `db:seed` / `db:reset` | ส่งต่อไปที่ `apps/api` |

## 13. CI (`.github/workflows/ci.yml`)
- **Trigger:** push และ pull request
- **Runner:** ubuntu-latest + MySQL 8.4 service container
- **ขั้นตอน:** checkout → setup Node 22 + pnpm → `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm typecheck` → `pnpm test`

## 14. บั๊กและช่องโหว่ที่ต้องแก้ (ทุกข้อที่ test ได้ต้องมี test)

| # | ปัญหาเดิม | ที่อยู่ในโค้ดเดิม | ผลหลังแก้ |
|---|---|---|---|
| B1 | signup ระบุ role อะไรก็ได้ รวมถึง `admin` | `routes/user.js:41` | รับแค่ `customer` / `merchant` |
| B2 | แก้สินค้าไม่ได้: validate `pro_name` แต่อ่านค่าจาก `proname` | `routes/shopdetail.js:133` | ใช้ schema จาก shared ที่เดียว |
| B3 | แก้ร้าน / สินค้าบังคับให้อัปรูปใหม่ทุกครั้ง | `createshop.js:130`, `shopdetail.js:127` | รูปไม่บังคับตอนแก้ไข |
| B4 | แก้สินค้า, เปลี่ยนสถานะสินค้า, เปลี่ยนสถานะคิว, ติ๊กรายการ ไม่เช็คความเป็นเจ้าของ | `shopdetail.js:116,178`, `queuemanager.js:78,100` | 403 ผ่าน policy |
| B5 | checkout ใช้ตะกร้าของคนอื่นได้ | `queue.js:80` | 404 |
| B6 | แก้หรือลบ cart item ของคนอื่นได้ และจำนวนลดจนติดลบได้ | `cart.js:178,202` | เช็คเจ้าของ + quantity ≥ 1 |
| B7 | ส่ง response ซ้ำ | `cart.js:104,190,213`, `queuemanager.js:116-121` | ส่ง response ครั้งเดียว |
| B8 | middleware ตอบ 400 แล้วไม่ `return` ทำให้โค้ดทำงานต่อ | `createshop.js:32-47,97-112` | เช็คใน service ด้วย throw |
| B9 | ค้นหาร้านใช้ตารางและคอลัมน์ที่ไม่มีอยู่ | `routes/index.js:15` | ค้นจาก `shops.name` |
| B10 | ติ๊กรายการคิวอ้างคอลัมน์ `check` ที่ไม่มีใน DB | `queuemanager.js:107` | `order_items.is_done` |
| B11 | token สุ่มด้วย `Math.random`, logout ไม่ลบ token, เก็บ token จริงใน DB | `utils/token.js` | `crypto` + เก็บ hash + `/auth/logout` |
| B12 | `router` หลุดเป็นตัวแปร global | ทุกไฟล์ใน routes | TS/ESM module scope |
| B13 | ประวัติยอดคิวเปลี่ยนตามราคาสินค้าปัจจุบัน | `queue.js`, `queuemanager.js` | `unit_price` |
| B14 | path รูปเก็บแบบ Windows (`\uploads\x.jpg`) | `file.path.substr(6)` | เก็บแค่ชื่อไฟล์ + `imageUrl` |
| B15 | error ส่งข้อมูลภายในออกไป (`err.toString()`, SQL error) | หลายไฟล์ | `errorHandler` กลาง |

## 15. Testing

- **TDD:** เขียน test ของ endpoint ก่อน แล้วค่อย implement
- **Integration test (หลัก):** supertest ยิง `createApp()` จริงกับ DB `canteen_test`
  - global setup รัน migration หนึ่งครั้ง
  - ล้างทุกตารางก่อนแต่ละ test
  - รันทีละไฟล์ (`fileParallelism: false`) เพราะใช้ DB ร่วมกัน
- **ต้องครอบคลุม:**
  - happy path ของทุก endpoint
  - 401 เมื่อไม่ login
  - 403 / 404 เมื่อไม่มีสิทธิ์
  - validation error ส่ง `details` ถูก path
  - ไฟล์ผิดชนิดหรือใหญ่เกิน
  - บั๊ก B1–B15 ที่ test ได้
- **Unit test:**
  - `shopPolicy`, `token` (สร้างและ hash)
  - `env` parse ผิดต้อง throw
  - schema ใน `packages/shared` เช่น กฎ password, confirmPassword และ coerce ราคา
- **OpenAPI:** มี test ยืนยันว่า `/api/openapi.json` มีครบทุก path ในข้อ 8.3

## 16. ไฟล์ที่ลบหรือย้าย

| ไฟล์เดิม | ผล |
|---|---|
| `backend/` ทั้งโฟลเดอร์ | `git mv` เป็น `apps/api/` แล้วแทนที่ด้วยโค้ด TS |
| `backend/static/css`, `js`, `webfonts` | ลบ (grep ยืนยันก่อนว่า `myfrontend/` ไม่ได้อ้างถึง) |
| `backend/static/uploads/*` | รูปที่ seed ใช้ย้ายไป `apps/api/seed/images/` ที่เหลือลบ |
| `backend/README.md` | ลบ (เป็นเอกสารแบบฝึกหัดสัปดาห์ที่ 9) |
| `dbpj.sql` | ลบ (แทนด้วย migration) |

## 17. เกณฑ์ตรวจรับเฟส 1

1. `pnpm lint`, `pnpm typecheck`, `pnpm test` ผ่านทั้งหมดทั้งในเครื่องและใน CI
2. `docker compose up` จากเครื่องที่ clone ใหม่ได้ API ที่ `GET /api/shops` คืนร้าน demo 5 ร้าน และรูปเปิดได้
3. `/api/docs` แสดงครบทุก endpoint
4. ไม่มี query DB นอก `*.repository.ts` / `db/` และไม่มี `req` / `res` ใน service หรือ repository (ตรวจด้วย grep)
5. บั๊ก B1–B15 แก้ครบ และทุกข้อที่ test ได้มี test ยืนยัน
6. ไม่มี `any` ในโค้ดของเรา (ESLint `no-explicit-any` เป็น error)
7. มีไฟล์ dump ของ DB เดิมอยู่ใน `.backups/`

## 18. ความเสี่ยง

| ความเสี่ยง | การรับมือ |
|---|---|
| เป็นงานใหญ่ (ทั้ง monorepo, API, infra) | implementation plan แตกเป็น task เล็กที่แต่ละ task test ผ่านและ commit ได้ เรียงลำดับ: monorepo + tooling → DB → ทีละ module → docs → Docker → CI |
| Library ใหม่ (Express 5, Drizzle, Zod + OpenAPI) มี API ต่างจากที่คุ้นเคย | pin เวอร์ชันใน plan และตรวจกับเอกสารของเวอร์ชันนั้นก่อนเขียน |
| คนพัฒนายังไม่คุ้นกับ TS / pnpm / Docker | สรุปสั้นๆ ทุกครั้งที่จบ task ว่าทำอะไรไปและเพราะอะไร และ README อธิบายคำสั่งหลัก |
| Frontend เก่าใช้ไม่ได้บน branch นี้ | ยอมรับได้ เพราะ `master` ไม่ได้รับผลกระทบ |
| Test DB ไปทับ DB จริง | guard ชื่อ DB ต้องลงท้ายด้วย `_test` + DB แยกอยู่ใน Docker |
