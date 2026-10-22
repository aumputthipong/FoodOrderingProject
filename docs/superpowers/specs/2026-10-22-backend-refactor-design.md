# Spec: Refactor Backend (เฟส 0–1)

- **วันที่:** 2026-10-22
- **สถานะ:** รอ review
- **Branch:** `refactor/architecture`
- **ภาพรวมทั้งโปรเจกต์:** เฟส 0–1 backend (เอกสารนี้) → เฟส 2 frontend Vue 3 → เฟส 3 ตรวจรับ → เฟส 4 redesign

---

## 1. บริบทและเป้าหมาย

โปรเจกต์นี้เป็นระบบสั่งอาหารในโรงอาหาร (Vue 2 + Express + MySQL) ทำไว้สมัยเรียนปี 2 ตอนนี้จะปรับเป็นผลงานใน portfolio

ปัญหาของ backend ปัจจุบัน:
- ทุก route ใส่ SQL, validation, การเช็คสิทธิ์ และการตอบ response ไว้ในฟังก์ชันเดียว
- มีโค้ดซ้ำหลายชุด
- ไม่มี error handler กลาง
- URL ไม่เป็น REST
- มีบั๊กและช่องโหว่ด้านสิทธิ์หลายจุด (ดูข้อ 12)

**เป้าหมาย:** backend ที่แบ่ง layer ชัดเจน (routes → controllers → services → repositories) มี API แบบ REST ที่สม่ำเสมอ มี test ครอบคลุม และ clone ไปรันได้ด้วย `.env.example` + `npm run db:reset`

**เกณฑ์ความสำเร็จ:** คนที่เปิด repo อ่านโฟลเดอร์ `backend/src/` แล้วเข้าใจได้ทันทีว่าแต่ละส่วนทำอะไร และทุกพฤติกรรมของ API มี test ยืนยัน

## 2. ขอบเขต

**ทำในรอบนี้**
- โครงสร้างโฟลเดอร์ใหม่ และการแบ่ง layer
- API ใหม่แบบ REST ภายใต้ `/api` (ข้อ 10)
- Database schema ใหม่ที่สะอาด, seed data และสคริปต์ reset
- แก้บั๊กและช่องโหว่ทั้งหมดในข้อ 12
- อัปเกรด dependency เป็น major version ปัจจุบัน
- Test ระดับ API ด้วย Vitest + supertest
- ESLint + Prettier

**ไม่ทำในรอบนี้**
- ฟีเจอร์ใหม่ เช่น ลบร้าน, ลบสินค้า, หน้า profile
- เปลี่ยนจาก opaque token ไปเป็น JWT
- ลบไฟล์รูปเก่าตอนอัปโหลดรูปใหม่ทับ
- TypeScript
- Frontend (อยู่ในเฟส 2) และการเปลี่ยนชื่อโฟลเดอร์ `myfrontend` เป็น `frontend` (ทำตอนเฟส 2)

## 3. การตัดสินใจทางเทคนิค

| เรื่อง | เลือก | เหตุผล |
|---|---|---|
| Module system | **ESM** (`"type": "module"`) | มาตรฐานปัจจุบันของ Node และต้องแก้ทุกไฟล์อยู่แล้ว |
| Framework | **Express 5** | stable แล้ว และส่ง error จาก async handler ให้เองโดยไม่ต้องห่อ |
| DB driver | **mysql2 3.x** (ใช้ SQL ตรง ไม่ใช้ ORM) | ให้ repository layer เห็น SQL ชัดเจน ไม่ต้องเรียน ORM เพิ่ม |
| Validation | **Joi** (ตัวเดิม เป็น version ล่าสุด) | คุ้นเคยอยู่แล้ว |
| Upload | **multer 2.x** | 1.x มีช่องโหว่ที่รู้กันแล้ว |
| Auth | **opaque token เก็บในตาราง `tokens`** (คงแนวเดิม) | revoke ได้ทันทีตอน logout และไม่ต้องจัดการ secret |
| Token | `crypto.randomBytes(32).toString('hex')` | แทน `Math.random` ซึ่งไม่ปลอดภัย |
| Password hash | bcrypt cost **10** | เดิมใช้ 5 ซึ่งต่ำเกินไป (hash เก่ายัง verify ได้) |
| Config | `dotenv` + `src/config/env.js` | รวมค่าคอนฟิกไว้ที่เดียว |
| รูปแบบชื่อ field ใน JSON | **snake_case** ตามคอลัมน์ใน DB | ไม่ต้องมี mapping layer เพิ่ม และสอดคล้องทั้งระบบ |
| Test | **Vitest + supertest** + test database แยก | ใช้ Vitest ตัวเดียวกับ frontend ในเฟส 2 |
| Dev server | `node --watch` | มีใน Node 22 อยู่แล้ว เลิกใช้ nodemon |

## 4. โครงสร้างโฟลเดอร์

```
backend/
├── .env.example
├── package.json
├── eslint.config.js
├── vitest.config.js
├── database/
│   ├── schema.sql            # schema ทั้งหมด (สร้างจากศูนย์)
│   ├── seed.sql              # ข้อมูล demo
│   ├── seed-images/          # รูปของข้อมูล demo (track ใน git)
│   ├── reset.js              # npm run db:reset
│   └── backups/              # ไฟล์ dump ของ DB เดิม (gitignored)
├── uploads/                  # ไฟล์ที่ผู้ใช้อัปโหลด (gitignored เหลือแค่ .gitkeep)
├── tests/
│   ├── setup/                # global setup: สร้าง test DB จาก schema.sql
│   ├── helpers/              # factory: createUser, loginAs, createShop, ...
│   ├── auth.test.js
│   ├── shops.test.js
│   ├── products.test.js
│   ├── cart.test.js
│   └── queues.test.js
└── src/
    ├── server.js             # เรียก app.listen
    ├── app.js                # สร้าง express app (ไม่ listen เพื่อให้ test import ได้)
    ├── config/
    │   ├── env.js            # อ่านและตรวจค่า env
    │   └── database.js       # pool + withTransaction()
    ├── routes/
    │   ├── index.js          # รวม router ทั้งหมดไว้ใต้ /api
    │   ├── auth.routes.js
    │   ├── shop.routes.js
    │   ├── product.routes.js
    │   ├── cart.routes.js
    │   └── queue.routes.js
    ├── controllers/          # auth, shop, product, cart, queue
    ├── services/             # auth, shop, product, cart, queue
    ├── repositories/         # user, token, shop, product, cart, queue
    ├── policies/
    │   └── shopPolicy.js     # canManageShop(user, shop)
    ├── middlewares/
    │   ├── requireAuth.js
    │   ├── requireRole.js
    │   ├── upload.js         # multer config เดียว
    │   ├── validate.js       # validate(schema, 'body' | 'query' | 'params')
    │   ├── notFound.js
    │   └── errorHandler.js
    ├── validators/           # Joi schemas แยกตาม resource
    └── utils/
        ├── errors.js         # AppError และ subclass (ข้อ 11)
        └── token.js
```

ไฟล์ที่จะลบ:
- `backend/config.js`, `backend/index.js`, `backend/routes/*`, `backend/middlewares/index.js`, `backend/utils/token.js` (ย้ายไปอยู่ใน `src/`)
- `backend/static/css`, `backend/static/js`, `backend/static/webfonts` (ต้อง grep ยืนยันก่อนว่า frontend ไม่ได้อ้างถึง)
- `dbpj.sql` (schema ไม่ตรงกับ DB จริง ใช้ `database/schema.sql` แทน)
- `backend/README.md` (เป็นเอกสารแบบฝึกหัดสัปดาห์ที่ 9 จะเขียนใหม่ในเฟส 3)

## 5. Layer และกฎการพึ่งพา

```
routes → middlewares → controllers → services → repositories → database
                                        ↘ policies
```

| Layer | ทำอะไร | ห้ามทำ |
|---|---|---|
| routes | จับคู่ method + path → middleware → controller | มี logic |
| controllers | ดึงค่าจาก `req` (params, body, file, user) → เรียก service → ส่ง `res.status().json()` | เขียน SQL หรือตัดสินใจทาง business |
| services | business rule, เช็คสิทธิ์ผ่าน policy, จัดการ transaction ด้วย `withTransaction`, throw `AppError` | แตะ `req` / `res` |
| repositories | SQL ล้วน รับ `conn` ที่ไม่บังคับ (default เป็น `pool`) คืนค่าเป็น plain object | เช็คสิทธิ์หรือ throw HTTP error |
| policies | pure function ตัดสินสิทธิ์ เช่น `canManageShop(user, shop)` คืนค่า `admin` หรือ `shop.create_by_id === user.id` | query DB |

```js
// config/database.js
export async function withTransaction(work) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const result = await work(conn)
    await conn.commit()
    return result
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
```

## 6. Config (`.env.example`)

```
PORT=3000
CORS_ORIGIN=http://localhost:5173
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=webproproject
UPLOAD_DIR=uploads
UPLOAD_MAX_MB=5
```

- `env.js` ตรวจว่าค่าที่จำเป็นมีครบ ถ้าขาดให้ throw ตอน start ทันที
- `CORS_ORIGIN` ใส่ได้หลายค่าโดยคั่นด้วย comma (ค่า default ตั้งไว้ที่ port ของ Vite dev server ที่จะใช้ในเฟส 2)
- Test ใช้ `.env.test` ที่ตั้ง `DB_NAME=webproproject_test` และ `UPLOAD_DIR` เป็นโฟลเดอร์ชั่วคราว

## 7. Database

### 7.1 แนวทาง
- **Backup ก่อนเสมอ:** dump DB `webproproject` ปัจจุบันด้วย `mysqldump` ไปที่ `database/backups/` ก่อนแตะ DB
- **ไม่เขียน migration แปลงข้อมูลเดิม:**
  - ข้อมูลปัจจุบันเป็นข้อมูลทดสอบ (users 7, คิว 8) ไม่มีคุณค่าต้องเก็บ
  - ร้าน 5 ร้านกับสินค้า 5 รายการจะถูกนำไปทำเป็น seed
  - จะใช้ `npm run db:reset` สร้างใหม่จาก `schema.sql` + `seed.sql`
- ไม่สร้างตารางตอน start server อีกต่อไป (ลบ `initDatabase()` ทิ้ง)

### 7.2 Schema ใหม่

ตัดคอลัมน์และ FK ที่ไม่ได้ใช้ทิ้ง ได้แก่ `shops_id`, `users_id`, `users_shops_id`, `carts_id`, `queue_items_id`, `shops_carts_*`, `queue_id_duplicate` และ `queue_items.status`

| ตาราง | คอลัมน์ | Constraint สำคัญ |
|---|---|---|
| `users` | id, username, password, first_name, last_name, email, mobile, role, created_at | `username` UNIQUE NOT NULL; `role` ENUM(`customer`, `merchant`, `admin`) |
| `tokens` | id, user_id, token, created_at | `token` CHAR(64) UNIQUE; FK user ON DELETE CASCADE |
| `shops` | id, name, description, picture, create_by_id, created_at | `create_by_id` **UNIQUE** (1 merchant มีได้ 1 ร้าน บังคับที่ระดับ DB) |
| `products` | id, shop_id, name, description, price, picture, status, created_at, updated_at | `status` ENUM(`available`, `not-available`) DEFAULT `not-available`; FK shop CASCADE |
| `carts` | id, user_id, shop_id, created_at, updated_at | UNIQUE(`user_id`, `shop_id`) (1 คนมีได้ 1 ตะกร้าต่อร้าน) |
| `cart_items` | id, cart_id, product_id, quantity, created_at, updated_at | UNIQUE(`cart_id`, `product_id`); CHECK(`quantity` >= 1) |
| `queues` | id, user_id, shop_id, status, created_at, finished_at | `status` ENUM(`waiting`, `finished`) DEFAULT `waiting` |
| `queue_items` | id, queue_id, product_id, quantity, **unit_price**, **is_done** | `unit_price` DECIMAL(10,2) NOT NULL; `is_done` BOOLEAN DEFAULT FALSE |

การเปลี่ยนที่มีผลต่อพฤติกรรม:
- **`queue_items.unit_price`:** เก็บราคา ณ ตอนสั่ง เดิมยอดรวมคิวคำนวณจากราคาสินค้าปัจจุบัน ถ้าร้านแก้ราคาภายหลัง ยอดในประวัติคิวจะเปลี่ยนตามไปด้วย
- **`queue_items.is_done`:** มาแทนคอลัมน์ `check` ที่โค้ดเดิมเรียกใช้ แต่ไม่มีอยู่จริงใน DB ฟีเจอร์ติ๊กรายการจึงพังมาตลอด
- **`queues.status`:** เปลี่ยนค่า `finish` เป็น `finished` และเก็บเวลาที่ปิดคิวไว้ใน `finished_at`
- **เวลาสั่ง:** ใช้ `queues.created_at` แทนคอลัมน์ `datetime`

### 7.3 Seed
- **ผู้ใช้ demo:** `merchant1`–`merchant5` (เจ้าของร้านละคน) และ `customer1` รหัสผ่านทุกบัญชีคือ `Password123` (จะระบุไว้ใน README)
- **ร้านและสินค้า:** ร้าน 5 ร้านกับสินค้า 5 รายการตามข้อมูลปัจจุบัน
- **รูป:** ย้ายรูปที่ใช้จริงจาก `backend/static/uploads/` ไปไว้ที่ `database/seed-images/`
- **`db:reset`:** copy รูปเข้า `UPLOAD_DIR` ก่อน แล้วค่อย insert ข้อมูล
- **path รูปใน DB:** ใช้รูปแบบเดียวทั้งระบบ คือ `uploads/<filename>` (forward slash, ไม่มี `/` นำหน้า) แก้ปัญหา path แบบ Windows `\uploads\...` ที่เก็บอยู่ตอนนี้

### 7.4 `npm run db:reset`
`database/reset.js` ทำงานตามลำดับนี้:
1. อ่าน env
2. แสดงชื่อ DB ที่จะ reset
3. DROP แล้ว CREATE database
4. รัน `schema.sql` แล้วตามด้วย `seed.sql`
5. copy รูป seed เข้า uploads

สคริปต์นี้ใช้ Node + mysql2 ทั้งหมด เพราะเครื่องนี้ไม่มี `mysql` CLI ใน PATH

## 8. Uploads
- **ที่เก็บ:** ไฟล์ไปอยู่ที่ `backend/uploads/` และ serve ที่ `GET /uploads/<filename>` ผ่าน `express.static`
- **ประเภทไฟล์:** รับเฉพาะ `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `image/gif`
- **ขนาด:** ไม่เกิน `UPLOAD_MAX_MB` ถ้าเกินตอบ 400 พร้อมข้อความที่อ่านเข้าใจได้
- **ชื่อไฟล์:** `<field>-<timestamp>-<random>.<ext>`
- **field ของ multipart:** ใช้ชื่อ `image` เหมือนกันทุก endpoint

## 9. Auth และสิทธิ์

- **`requireAuth`:**
  - อ่าน header `Authorization: Bearer <token>` แล้วหา token ใน DB
  - ใส่ `req.user = { id, username, first_name, last_name, email, mobile, role, shop_id }` (`shop_id` เป็น null ถ้ายังไม่มีร้าน)
  - ถ้าไม่ผ่านตอบ 401
- **`requireRole(...roles)`:** ถ้า role ไม่ตรงตอบ 403
- **ความเป็นเจ้าของ:** เช็คใน service ผ่าน `shopPolicy.canManageShop` ถ้าไม่ผ่าน throw `ForbiddenError` (403)
- **ตะกร้าและคิวของลูกค้า:** service เช็คว่า `user_id` ตรงกับผู้ใช้ ถ้าไม่ตรงให้ตอบ **404** (ไม่เปิดเผยว่า resource ของคนอื่นมีอยู่จริง)

| การกระทำ | ใครทำได้ |
|---|---|
| ดูร้าน / สินค้า | ทุกคน (ไม่ต้อง login) |
| สร้างร้าน | `merchant` ที่ยังไม่มีร้าน, `admin` |
| แก้ร้าน, เพิ่ม / แก้ / เปลี่ยนสถานะสินค้า, จัดการคิวของร้าน | เจ้าของร้าน, `admin` |
| ตะกร้า, checkout, ดูคิวของตัวเอง | ผู้ใช้ที่ login แล้ว (เฉพาะข้อมูลของตัวเอง) |
| สมัครสมาชิก | เลือก role ได้แค่ `customer` หรือ `merchant` เท่านั้น |

## 10. API

ทุก endpoint ขึ้นต้นด้วย `/api` ยกเว้น `/uploads/*`

- **Success:** ตอบเป็นข้อมูลตรงๆ ไม่มี wrapper
- **Error:** ตอบตามรูปแบบในข้อ 11
- **เวลา:** ส่งเป็น ISO 8601 ให้ frontend จัดรูปแบบเอง (เลิกใช้ `DATE_FORMAT` ใน SQL)
- **ราคา:** ส่งเป็น number

### 10.1 Auth
| Method | Path | Auth | Body | Success |
|---|---|---|---|---|
| POST | `/api/auth/signup` | – | username, password, confirm_password, first_name, last_name, email, mobile, role | 201 `User` |
| POST | `/api/auth/login` | – | username, password | 200 `{ token, user: User }` |
| POST | `/api/auth/logout` | ✔ | – | 204 (ลบ token ที่ใช้อยู่) |
| GET | `/api/auth/me` | ✔ | – | 200 `User` |

- **`User`:** `{ id, username, first_name, last_name, email, mobile, role, shop_id }` ไม่มี password
- **login:** สร้าง token ใหม่ทุกครั้ง (login หลายเครื่องได้) ถ้า username หรือรหัสผิดตอบ 401 ด้วยข้อความเดียวกัน
- **signup:** username ซ้ำตอบ 409 ส่วนกฎ validation เหมือนเดิม:
  - password ยาว 8 ตัวขึ้นไป และต้องมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลข
  - mobile ต้องตรงรูปแบบ `0[0-9]{9}`
  - username ยาว 5–20 ตัวอักษร

### 10.2 Shops และ Products
| Method | Path | Auth | Body | Success |
|---|---|---|---|---|
| GET | `/api/shops?search=` | – | – | 200 `Shop[]` (ค้นจาก `name`) |
| GET | `/api/shops/:id` | – | – | 200 `Shop & { products: Product[] }` |
| POST | `/api/shops` | merchant / admin | multipart: name, description, image | 201 `Shop` |
| PUT | `/api/shops/:id` | เจ้าของ / admin | multipart: name, description, image (ไม่บังคับ) | 200 `Shop` |
| POST | `/api/shops/:shopId/products` | เจ้าของ / admin | multipart: name, description, price, image | 201 `Product` |
| PUT | `/api/products/:id` | เจ้าของ / admin | multipart: name, description, price, image (ไม่บังคับ) | 200 `Product` |
| PATCH | `/api/products/:id/status` | เจ้าของ / admin | `{ status: 'available' \| 'not-available' }` | 200 `Product` |

- **`Shop`:** `{ id, name, description, picture, create_by_id, created_at }`
- **`Product`:** `{ id, shop_id, name, description, price, picture, status }`
- **สร้างร้าน:** ถ้ามีร้านอยู่แล้วตอบ 409 ถ้าไม่ได้แนบรูปตอบ 400
- **สินค้าใหม่:** สถานะเริ่มต้นเป็น `not-available` ตามพฤติกรรมเดิม

### 10.3 Cart
| Method | Path | Auth | Body | Success |
|---|---|---|---|---|
| GET | `/api/cart?shopId=` | ✔ | – | 200 `Cart[]` (ถ้าระบุ `shopId` ได้ 0–1 รายการ) |
| PUT | `/api/cart/shops/:shopId/items` | ✔ | `{ items: [{ product_id, quantity }] }` | 200 `Cart` หรือ 204 ถ้า items ว่าง |
| PATCH | `/api/cart/items/:id` | ✔ | `{ quantity }` (≥ 1) | 200 `CartItem` |
| DELETE | `/api/cart/items/:id` | ✔ | – | 204 |

- **`Cart`:** `{ id, shop: { id, name, picture }, items: CartItem[], total_price }`
- **`CartItem`:** `{ id, product_id, name, picture, price, quantity, subtotal }`
- **PUT items:** **แทนที่**ของทั้งหมดในตะกร้าของร้านนั้น (ตรงกับที่หน้าร้านส่งตะกร้าทั้งก้อนมา)
  - สินค้าทุกชิ้นต้องเป็นของร้านนั้น และมีสถานะ `available` ไม่งั้นตอบ 400
  - ถ้า items ว่าง ให้ลบตะกร้าทิ้ง
- **DELETE item:** ถ้าเป็นชิ้นสุดท้ายให้ลบตะกร้าด้วย
- **id ที่ใช้อ้างอิง:** เปลี่ยนจาก productId เป็น cart item id

### 10.4 Queues
| Method | Path | Auth | Body | Success |
|---|---|---|---|---|
| POST | `/api/queues` | ✔ | `{ cart_id }` | 201 `Queue` |
| GET | `/api/queues/mine` | ✔ | – | 200 `{ waiting: Queue[], finished: Queue[] }` |
| GET | `/api/shops/mine/queues` | merchant / admin ที่มีร้าน | – | 200 `{ waiting: ShopQueue[], finished: ShopQueue[] }` |
| PATCH | `/api/queues/:id/status` | เจ้าของร้าน / admin | `{ status: 'waiting' \| 'finished' }` | 200 `Queue` |
| PATCH | `/api/queue-items/:id` | เจ้าของร้าน / admin | `{ is_done: boolean }` | 200 `QueueItem` |

- **`Queue`:** `{ id, status, created_at, finished_at, shop: { id, name }, items: QueueItem[], total_price }`
- **`ShopQueue`:** `Queue & { customer: { id, first_name, mobile } }`
- **`QueueItem`:** `{ id, product_id, name, picture, unit_price, quantity, is_done }`
- **Checkout (POST):**
  - ทั้งหมดอยู่ใน transaction เดียว
  - ตะกร้าต้องเป็นของผู้ใช้และไม่ว่าง (ไม่ใช่ของตัวเองตอบ 404, ว่างตอบ 400)
  - snapshot ราคาลง `unit_price` แล้วลบตะกร้า
- **ลำดับรายการ:** `waiting` เรียงคิวเก่าก่อน ส่วน `finished` เรียงคิวใหม่ก่อน
- **คิวของร้าน:** ถ้าผู้ใช้ยังไม่มีร้านตอบ 404
- **การกำหนด route:** ต้องประกาศ `/api/shops/mine/...` ก่อน `/api/shops/:id`

## 11. Error handling

- **`utils/errors.js`:** มี `AppError(status, message, details)` และ subclass:
  - `ValidationError` (400)
  - `UnauthorizedError` (401)
  - `ForbiddenError` (403)
  - `NotFoundError` (404)
  - `ConflictError` (409)
- **`errorHandler`:** ตอบในรูปแบบเดียวกันทุกครั้ง
  ```json
  { "error": { "message": "ข้อความที่อ่านเข้าใจได้", "details": [{ "field": "price", "message": "..." }] } }
  ```
  - `details` มีเฉพาะ validation error
  - error ที่ไม่ใช่ `AppError` ให้ log ฝั่ง server แล้วตอบ 500 `"Internal server error"` (ไม่ส่ง stack หรือ SQL ออกไป)
  - error จาก multer (ขนาดหรือชนิดไฟล์) ให้แปลงเป็น 400
- **`notFound`:** path ที่ไม่มีอยู่ตอบ 404 ในรูปแบบเดียวกัน
- **Express 5:** ส่ง error จาก async handler เข้า `errorHandler` ให้เอง ไม่ต้องมี `asyncHandler`

## 12. บั๊กและช่องโหว่ที่ต้องแก้ (ทุกข้อต้องมี test)

| # | ปัญหาเดิม | ที่อยู่เดิม | ผลหลังแก้ |
|---|---|---|---|
| B1 | signup ระบุ role อะไรก็ได้ (รวมถึง `admin`) | `routes/user.js:41` | รับแค่ `customer` / `merchant` |
| B2 | แก้สินค้าไม่ได้: validate `pro_name` แต่อ่านค่าจาก `proname` | `routes/shopdetail.js:133` | ฟอร์มใช้ชื่อ field เดียวกันทั้งระบบ |
| B3 | แก้ร้าน / สินค้าบังคับให้อัปโหลดรูปใหม่ทุกครั้ง | `createshop.js:130`, `shopdetail.js:127` | รูปไม่บังคับตอนแก้ไข |
| B4 | แก้สินค้า, เปลี่ยนสถานะสินค้า, เปลี่ยนสถานะคิว, ติ๊กรายการคิว ไม่เช็คความเป็นเจ้าของ | `shopdetail.js:116,178`, `queuemanager.js:78,100` | เช็คด้วย policy ตอบ 403 |
| B5 | checkout ใช้ตะกร้าของคนอื่นได้ | `queue.js:80` | ตอบ 404 |
| B6 | แก้หรือลบ cart item ของคนอื่นได้ และจำนวนลดจนติดลบได้ | `cart.js:178,202` | เช็คเจ้าของ และ quantity ต้อง ≥ 1 |
| B7 | ส่ง response ซ้ำ (`res.json` แล้วตามด้วย `res.redirect`) | `cart.js:104,190,213`, `queuemanager.js:116-121` | ส่ง response ครั้งเดียว |
| B8 | middleware ตอบ 400 แล้วไม่ `return` ทำให้โค้ดทำงานต่อ | `createshop.js:32-47,97-112` | ย้ายไปเช็คใน service ที่ throw error |
| B9 | ค้นหาร้านใช้ตาราง `shop` และคอลัมน์ `title` ที่ไม่มีอยู่ | `routes/index.js:15` | ค้นจาก `shops.name` |
| B10 | ติ๊กรายการคิวอ้างคอลัมน์ `check` ที่ไม่มีใน DB | `queuemanager.js:107` | ใช้ `queue_items.is_done` |
| B11 | token สุ่มด้วย `Math.random` และ logout ไม่ลบ token | `utils/token.js`, frontend | ใช้ `crypto` และมี `/auth/logout` |
| B12 | `router` ไม่ได้ประกาศด้วย `const` จึงหลุดเป็น global | ทุกไฟล์ใน routes | ใช้ ESM module scope |
| B13 | ประวัติยอดคิวเปลี่ยนตามราคาสินค้าปัจจุบัน | `queue.js`, `queuemanager.js` | ใช้ `unit_price` |
| B14 | path รูปถูกเก็บแบบ Windows (`\uploads\x.jpg`) | `file.path.substr(6)` | เก็บเป็น `uploads/x.jpg` |
| B15 | error ส่งข้อมูลภายในออกไป (`err.toString()`, SQL error) | หลายไฟล์ | ใช้ errorHandler กลาง |

## 13. ผลกระทบต่อ frontend เก่าระหว่างเฟส

API เปลี่ยนทั้ง URL และรูปร่างข้อมูล frontend Vue 2 ตัวเดิมจึง**จะใช้งานไม่ได้บน branch นี้** ตั้งแต่จบเฟส 1 จนถึงเฟส 2

- **เปลี่ยนจากแผนเดิม:** แผนแรกบอกว่าจะ patch frontend เก่าระหว่างทาง แต่ถ้าทำ ต้องรื้อ template ของหน้าตะกร้าและหน้าคิวที่กำลังจะถูกเขียนใหม่ในเฟส 2 อยู่แล้ว ทำไปก็เป็นงานทิ้ง
- **การยืนยันว่า backend ใช้ได้:** ใช้ API test (ข้อ 14) กับการยิง request ทดสอบด้วยมือ
- **`master` ไม่ได้รับผลกระทบ:** จะ merge `refactor/architecture` เข้า `master` หลังจบเฟส 2–3 เท่านั้น

## 14. Testing

- **TDD:** เขียน test ของแต่ละ endpoint ก่อน แล้วค่อย implement
- **Test DB:** `webproproject_test` สร้างจาก `schema.sql` ตอน global setup และล้างตารางก่อนแต่ละ test file
- **ไฟล์ test:** เขียน fixture ผ่าน helper เช่น `createUser`, `loginAs`, `createShop`, `createProduct` และรันทีละไฟล์ (`fileParallelism: false`) เพราะใช้ DB ร่วมกัน
- **สิ่งที่ต้องครอบคลุม:**
  - happy path ของทุก endpoint ในข้อ 10
  - 401 เมื่อไม่ login, 403 / 404 เมื่อไม่มีสิทธิ์ (ทุกข้อใน B1–B15 ที่ test ได้)
  - validation error ส่ง `details` ถูก field
  - อัปโหลดไฟล์ผิดชนิดหรือใหญ่เกินตอบ 400
- **Unit test:** สำหรับ `shopPolicy` และ `token`

## 15. Scripts และเครื่องมือ

| Script | คำสั่ง |
|---|---|
| `npm run dev` | `node --watch src/server.js` |
| `npm start` | `node src/server.js` |
| `npm test` | `vitest run` |
| `npm run db:reset` | `node database/reset.js` |
| `npm run lint` | `eslint .` |
| `npm run format` | `prettier --write .` |

- ESLint: flat config + `eslint-plugin-n` (กฎของ Node)
- Prettier: ใช้ค่า default + `singleQuote`, `semi: false` ให้ตรงกับสไตล์ส่วนใหญ่ของโค้ดเดิม
- `package.json`: เปลี่ยน `name` เป็น `canteen-ordering-api` และใส่ `description` ใหม่ (เป็นการแก้ปัญหาที่ description ถูกลบค้างอยู่ไปในตัว)
- `.gitignore`: เพิ่ม `backend/uploads/*` (ยกเว้น `.gitkeep`), `backend/database/backups/`, `.env.test`

## 16. เกณฑ์ตรวจรับเฟส 1

1. `npm test` ผ่านทั้งหมด
2. `npm run lint` ได้ 0 error
3. ไม่มี SQL นอก `src/repositories/` และไม่มี `req` / `res` ใน `services/` หรือ `repositories/` (ตรวจด้วย grep)
4. บั๊ก B1–B15 แก้ครบ และทุกข้อที่ test ได้มี test ยืนยัน
5. ทำตามขั้นตอนนี้แล้วรันได้: copy `.env.example` เป็น `.env` → `npm install` → `npm run db:reset` → `npm run dev` และ `GET /api/shops` คืนร้าน demo 5 ร้าน
6. มีไฟล์ backup ของ DB เดิมอยู่ใน `database/backups/`

## 17. ความเสี่ยง

| ความเสี่ยง | การรับมือ |
|---|---|
| ข้อมูลใน DB เดิมหาย | dump เก็บไว้ก่อน reset (ข้อ 7.1) |
| Frontend เก่าใช้งานไม่ได้ระหว่างเฟส | ยอมรับได้ (ข้อ 13) เพราะ `master` ยังใช้งานได้ปกติ |
| Express 5 / multer 2 / mysql2 3 มี breaking change | test ระดับ API ครอบคลุมทุก endpoint จะจับได้ |
| Test DB ไปทับ DB จริง | test setup ปฏิเสธการทำงานถ้า `DB_NAME` ไม่ลงท้ายด้วย `_test` ส่วน `db:reset` แสดงชื่อ DB และ host ก่อนเริ่มเสมอ |
