# Spec เฟส 2: Frontend ใหม่ (`apps/web`)

- **วันที่:** 2026-10-23
- **สถานะ:** รอ review
- **Branch:** `refactor/architecture`
- **Roadmap:** `2026-10-22-roadmap.md`
- **ต่อจาก:** `2026-10-22-phase1-backend-foundation-design.md` (API และ `@canteen/shared`)
- **Mockup:** canvas "Canteen Design Directions" บน claude.ai (https://claude.ai/artifact/4gjFo6ypkBrAVSgsEpJZ83) แท็บ "แบบ D สีส้มพริก"

---

## 1. เป้าหมาย

สร้าง frontend ใหม่ใน `apps/web` ด้วย Vue 3 + TypeScript + Tailwind + shadcn-vue แทน `myfrontend/` (Vue 2) ที่ใช้กับ API ใหม่ไม่ได้แล้ว

**ฟีเจอร์ต้องเท่าเดิม** (ดูข้อ 14) หน้าตาใหม่ทั้งหมดตามดีไซน์ที่เลือก ใช้เฉพาะ endpoint ที่มีอยู่ใน API เฟส 1 โดยไม่แก้โค้ด API

**เกณฑ์ความสำเร็จ:**
- ลูกค้าและแม่ค้าทำทุก flow ได้ครบบนระบบจริง (`docker compose up`)
- คนที่เปิด `apps/web/src/features/` เข้าใจได้ทันทีว่าแต่ละฟีเจอร์อยู่ที่ไหน และโครงสร้างไปทางเดียวกับ `apps/api/src/modules/`
- หน้าตามีเอกลักษณ์ ไม่ดูเป็น template สำเร็จรูป และสวยพอใช้ทำภาพหรือ GIF ใน README
- lint, typecheck, test และ build ผ่านใน CI

## 2. ขอบเขต

**ทำในเฟสนี้**
- `apps/web`: ทุกหน้าในข้อ 7 พร้อม test ตามข้อ 12
- เปลี่ยนรูปใน seed เป็นรูปอาหารจริง (ข้อ 10)
- Docker: เพิ่ม service `web` (nginx) ใน compose
- CI: เพิ่มขั้น build
- ลบ `myfrontend/` และอัปเดต README

**ไม่ทำในเฟสนี้**
- Realtime / Socket.IO และสถานะออเดอร์แบบใหม่ (เฟส 3) ช่วงนี้ใช้ polling แทน (ข้อ 8.3)
- แก้โค้ด API หรือเพิ่ม endpoint เช่น จำนวนเมนูต่อร้าน, ลบร้าน, ลบสินค้า, แก้ profile
- Dark mode
- E2E ด้วย Playwright (เฟส 4)
- เปลี่ยนการเก็บ token เป็น httpOnly cookie (ดูข้อ 9.4)

## 3. ทิศทางดีไซน์ (ตัดสินใจแล้ว)

| เรื่อง | เลือก | เหตุผล |
|---|---|---|
| หน้าตาโดยรวม | แบบแอป food delivery (mockup D) | flow เลือกร้าน → ตะกร้า → สั่ง → รอคิว คนเห็นแล้วเข้าใจทันที |
| เอกลักษณ์ | "บัตรคิว" (เลขคิวตัวใหญ่ + เส้นปรุ) จาก mockup A ใช้ในหน้าคิว | กันไม่ให้ดูเหมือนแอปเจ้าใหญ่ และผูกกับฟีเจอร์คิวที่จะทำ realtime ในเฟส 3 |
| สีหลัก | ส้มพริก `#C2410C` คู่เหลืองไข่ `#F5B83D` | สีอาหาร ไม่ซ้ำกับแอปเจ้าใหญ่ (เขียว / ชมพู) |
| ชื่อแอป | **Canteen** | ตรงกับชื่อ repo |
| อุปกรณ์หลัก | ลูกค้า: มือถือก่อน / แม่ค้า: คอมหรือแท็บเล็ตก่อน | ลูกค้าสั่งจากโต๊ะ แม่ค้าดูคิวจากจอที่ร้าน |
| รูป | รูปอาหารจริงที่ license ใช้ใน portfolio ได้ | รูป seed เดิมเป็นโลโก้ clipart ขาวดำ ทำให้การ์ดดูโล่ง |

**ต่างจาก mockup:** ป้าย "x เมนู" บนการ์ดร้านถูกตัดออก เพราะ `GET /api/shops` ไม่ส่งจำนวนเมนูมา

## 4. เครื่องมือ

| เรื่อง | เลือก |
|---|---|
| Framework | Vue 3 (`<script setup lang="ts">`) + Vite |
| Routing | Vue Router 4 |
| Server state | TanStack Query (`@tanstack/vue-query`) |
| Client state | Pinia (เฉพาะ store `auth`) |
| UI | Tailwind CSS v4 (`@theme` ใน CSS ไม่มี `tailwind.config.js`) + shadcn-vue (Reka UI) |
| ไอคอน | `lucide-vue-next` |
| ฟอนต์ | Prompt (หัวข้อ) + Noto Sans Thai (เนื้อหา) ผ่าน `@fontsource` ไม่ดึงจาก Google ตอนรัน |
| ฟอร์ม | vee-validate + `@vee-validate/zod` กับ schema จาก `@canteen/shared` |
| Toast | `vue-sonner` (ตัวที่ shadcn-vue ใช้) |
| Test | Vitest + Vue Test Utils + MSW (jsdom) |
| Typecheck | `vue-tsc` |
| Lint | `eslint-plugin-vue` เพิ่มเข้า flat config ของ root, Prettier ชุดเดียวกับ API |

ตอนเขียน implementation plan จะ pin เวอร์ชันเป็นตัว stable ล่าสุด และเช็คว่าเข้ากับ Node 24, TypeScript 6.0 และ ESLint 10 ที่ใช้อยู่

## 5. โครงสร้าง `apps/web`

```
apps/web/
├─ index.html              # lang="th"
├─ vite.config.ts          # proxy /api และ /uploads → API
├─ components.json         # config ของ shadcn-vue
├─ Dockerfile              # build → nginx
├─ nginx.conf
└─ src/
   ├─ main.ts              # createApp + Pinia + Vue Query + Router
   ├─ App.vue
   ├─ router/              # routes + guard
   ├─ layouts/             # CustomerLayout, MerchantLayout, AuthLayout
   ├─ components/
   │  ├─ ui/               # จาก shadcn-vue
   │  └─ *.vue             # ใช้ร่วมกันทั้งแอป (ข้อ 9.3)
   ├─ features/
   │  ├─ auth/             # api.ts, store.ts, pages/, components/
   │  ├─ shops/            # api.ts, queries.ts, pages/, components/
   │  ├─ cart/
   │  ├─ orders/
   │  └─ merchant/
   ├─ lib/
   │  ├─ api-client.ts
   │  ├─ api-error.ts
   │  ├─ error-messages.ts
   │  ├─ query-client.ts
   │  ├─ query-keys.ts
   │  └─ format.ts         # formatPrice (฿), formatTime
   └─ styles/main.css      # Tailwind + design token
```

แต่ละ feature มี `index.ts` ที่ export เฉพาะสิ่งที่ feature อื่นใช้ได้

## 6. กฎของ layer

```
pages/            ประกอบหน้า: เรียก query / mutation แล้วส่งข้อมูลให้ component
   ↓
components/       แสดงผลอย่างเดียว: รับ props, ส่ง emit, ไม่เรียก API
queries.ts        useXxxQuery / useXxxMutation: ผูก query key กับการ invalidate
   ↓
api.ts            ฟังก์ชันต่อ endpoint คืนค่าเป็น type จาก @canteen/shared
   ↓
lib/api-client.ts ตัวเดียวที่เรียก fetch
```

- feature หนึ่งใช้ของอีก feature ได้ผ่าน `index.ts` เท่านั้น ห้าม import ไฟล์ภายในของ feature อื่น
- type ของ request และ response มาจาก `@canteen/shared` เท่านั้น ห้ามประกาศซ้ำ
- component ใน `components/` และ `features/*/components/` ห้ามเรียก query, mutation หรือ api โดยตรง

## 7. Routes และ layout

| Path | หน้า | Layout | สิทธิ์ |
|---|---|---|---|
| `/` | หน้าแรก: ค้นหา + รายการร้าน | Customer | ทุกคน |
| `/shops/:id` | หน้าร้าน + เมนู | Customer | ทุกคน (กดเพิ่มตะกร้าตอนยังไม่ login จะไป `/login?redirect=`) |
| `/cart` | ตะกร้า แยกกล่องละร้าน แต่ละร้านมีปุ่มสั่งของตัวเอง | Customer | login |
| `/orders` | คิวของฉัน: แท็บ "กำลังทำ" / "เสร็จแล้ว" | Customer | login |
| `/account` | ข้อมูลผู้ใช้, ออกจากระบบ, ลิงก์ไปหน้าร้าน (merchant) | Customer | login |
| `/login`, `/signup` | เข้าสู่ระบบ, สมัคร (เลือก role ได้) | Auth | ยังไม่ login |
| `/merchant/queue` | จัดการคิว | Merchant | merchant ที่มีร้าน |
| `/merchant/menu` | รายการเมนู + สวิตช์เปิด/ปิดขาย | Merchant | merchant ที่มีร้าน |
| `/merchant/menu/new`, `/merchant/menu/:id/edit` | ฟอร์มเมนู | Merchant | merchant ที่มีร้าน |
| `/merchant/shop` | แก้ข้อมูลร้าน | Merchant | merchant ที่มีร้าน |
| `/merchant/shop/new` | สร้างร้าน | Merchant | merchant ที่ยังไม่มีร้าน |
| `/merchant` | redirect ไป `/merchant/queue` | – | – |
| `/:pathMatch(.*)*` | Not Found | Customer | ทุกคน |

`admin` ได้สิทธิ์เหมือน merchant ในทุก route ของ `/merchant/*` ตามสิทธิ์ของ API

**Layout**
- **CustomerLayout:** จอต่ำกว่า 768px มีแถบเมนูล่าง 4 ปุ่ม (หน้าแรก, ตะกร้าพร้อม badge, คิวของฉัน, บัญชี) ส่วนจอ 768px ขึ้นไปเปลี่ยนเป็น top nav
- **MerchantLayout:** จอ 1024px ขึ้นไปมี sidebar (ข้อมูลร้าน + เมนู 3 ข้อ) จอเล็กกว่านั้นเมนูย้ายไปเป็นแท็บด้านบน
- **AuthLayout:** ฟอร์มกลางจอ พร้อมโลโก้

## 8. Data flow

### 8.1 Query keys (`lib/query-keys.ts`)

| Key | Endpoint | ใช้ที่ |
|---|---|---|
| `['shops', 'list', { search }]` | `GET /api/shops?search=` | หน้าแรก |
| `['shops', 'detail', id]` | `GET /api/shops/:id` (ได้เมนูทุกสถานะ) | หน้าร้าน, `/merchant/menu`, ฟอร์มเมนู, ฟอร์มร้าน |
| `['cart']` | `GET /api/cart` | ตะกร้า, badge, จำนวนบนหน้าร้าน (กรองตามร้านฝั่ง client) |
| `['orders', 'mine']` | `GET /api/orders/mine` | คิวของฉัน |
| `['orders', 'shop']` | `GET /api/shops/mine/orders` | จัดการคิว |

user ไม่อยู่ใน Query ให้ store `auth` ดูแล

### 8.2 Mutations

| การกระทำ | Endpoint | หลังสำเร็จ |
|---|---|---|
| + / − บนหน้าร้าน | `PUT /api/cart/shops/:shopId/items` | invalidate `['cart']` |
| แก้จำนวนในตะกร้า | `PATCH /api/cart/items/:id` | invalidate `['cart']` |
| ลบในตะกร้า (กด − ตอนจำนวนเป็น 1) | `DELETE /api/cart/items/:id` | invalidate `['cart']` |
| สั่งอาหาร | `POST /api/orders` | invalidate `['cart']`, `['orders','mine']` แล้วไป `/orders` |
| ติ๊กรายการเสร็จ | `PATCH /api/order-items/:id` | optimistic บน `['orders','shop']` แล้ว invalidate |
| เสร็จทั้งออเดอร์ / ย้อนกลับ | `PATCH /api/orders/:id/status` | invalidate `['orders','shop']` |
| สร้าง / แก้เมนู | `POST /api/shops/:shopId/products`, `PUT /api/products/:id` | invalidate `['shops','detail',shopId]` |
| เปิด / ปิดขาย | `PATCH /api/products/:id/status` | optimistic บน `['shops','detail',shopId]` แล้ว invalidate |
| สร้าง / แก้ร้าน | `POST /api/shops`, `PUT /api/shops/:id` | invalidate `['shops']` ทั้งหมด ถ้าสร้างร้านให้โหลด `/api/auth/me` ใหม่ |

### 8.3 จุดที่ต้องระวัง

1. **ปุ่ม + / − บนหน้าร้าน:** `PUT` แทนที่รายการทั้งหมดของร้าน ถ้ากดรัวจะมีหลาย request ที่อาจกลับมาไม่ตามลำดับ
   - ตัวเลขบนจอเปลี่ยนทันที (state ในหน้า)
   - รอให้หยุดกด 300ms แล้วส่ง `PUT` ครั้งเดียวด้วยค่าล่าสุด
   - ระหว่างมี request ค้าง ถ้ามีการกดเพิ่มให้รอ request เดิมเสร็จก่อนค่อยส่งรอบใหม่ (ส่งทีละ request ต่อร้าน)
   - เสร็จแล้ว invalidate `['cart']` ถ้า error ให้คืนตัวเลขตาม server และแสดง toast
   - logic นี้อยู่ใน composable `useShopCartDraft(shopId)` ที่ test แยกได้
2. **Polling แทน realtime (ชั่วคราว):** query `['orders','mine']` และ `['orders','shop']` ตั้ง `refetchInterval: 15_000` และ refetch เมื่อกลับมาที่แท็บ เฟส 3 จะลบออกแล้วใช้ Socket.IO แทน
3. **ตรวจ response ด้วย Zod:** ทุกฟังก์ชันใน `api.ts` ส่ง schema จาก `@canteen/shared` ให้ `api-client` ตรวจ response ถ้าไม่ตรงจะได้ `ApiError` code `INVALID_RESPONSE`
4. **ค่าเริ่มต้นของ QueryClient:**
   - `staleTime: 30_000`
   - query ที่ได้ `ApiError` สถานะ 4xx ไม่ retry ส่วน error อื่น retry 1 ครั้ง
   - mutation ไม่ retry
5. **Multipart:** `api-client` รับ `FormData` และไม่ตั้ง `Content-Type` เอง

## 9. Auth, error และ UI

### 9.1 Auth flow
1. **Login:** `POST /api/auth/login` แล้วเก็บ token ใน `localStorage` (key `canteen.token`) และ user ใน store `auth`
   - customer ไปตาม `?redirect=` (ยอมรับเฉพาะ path ภายในที่ขึ้นต้นด้วย `/`) หรือหน้าแรก
   - merchant / admin ไป `/merchant/queue`
2. **เปิดแอป:** ถ้ามี token ให้ store เรียก `GET /api/auth/me` ก่อน guard แรกทำงาน (guard รอ `auth.ready`) ถ้าได้ 401 ให้ลบ token
3. **Guard:** อ่าน `meta.requiresAuth`, `meta.guestOnly` และ `meta.roles`
   - ยังไม่ login: ไป `/login?redirect=<path>`
   - login แล้วเข้าหน้า guest: ไปหน้าแรก
   - role ไม่ตรง: ไปหน้าแรก
   - merchant ที่ `shopId === null` เข้า `/merchant/*` (ยกเว้น `/merchant/shop/new`): ไป `/merchant/shop/new` และ merchant ที่มีร้านแล้วเข้า `/merchant/shop/new`: ไป `/merchant/shop`
4. **ได้ 401 ระหว่างใช้งาน** (ยกเว้นตอน login): `api-client` เรียก handler ที่ store `auth` ลงทะเบียนไว้ เพื่อล้าง auth และ `queryClient.clear()` แล้วไป `/login?redirect=<path ปัจจุบัน>`
5. **Logout:** `POST /api/auth/logout` (ถ้า error ก็ยังล้างฝั่ง client) แล้วลบ token, `queryClient.clear()` และไปหน้าแรก
6. **สร้างร้านเสร็จ:** เรียก `GET /api/auth/me` ใหม่เพื่ออัปเดต `shopId`

### 9.2 Error handling
- **`ApiError`** (`lib/api-error.ts`): `{ status, code, message, details? }`
  - code มาจาก `errorCodeSchema` ของ API และเพิ่มอีก 2 ตัวที่เกิดเฉพาะฝั่ง client
  - `NETWORK_ERROR`: fetch ล้มหรือการเชื่อมต่อถูกตัด ครอบคลุม ECONNRESET ตอนอัปโหลด
  - `INVALID_RESPONSE`: response ไม่ตรง schema หรือไม่ใช่ JSON
- **`lib/error-messages.ts`:** แปลง code เป็นข้อความไทย เช่น
  - `CONFLICT` ตอนสมัคร: "ชื่อผู้ใช้นี้ถูกใช้แล้ว"
  - `RATE_LIMITED`: "ลองใหม่อีกครั้งในอีกสักครู่"
  - `NETWORK_ERROR`: "เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้ง"
  - ถ้าไม่มีในตาราง ใช้ข้อความกลาง
- **ฟอร์ม:** ตรวจด้วย Zod ก่อนส่ง ถ้า server ตอบ `VALIDATION_ERROR` ให้นำ `details[].path` ไปแสดงใต้ช่องนั้นด้วย `setErrors` ส่วน `details` ที่ไม่ตรงกับช่องไหน ให้แสดงเป็นข้อความรวมบนฟอร์ม
- **หน้า:** query error แสดง `ErrorState` พร้อมปุ่ม "ลองใหม่" ถ้าร้านไม่พบ (404) แสดงหน้า Not Found
- **error ที่ไม่ได้ดักไว้:** `app.config.errorHandler` แสดง toast และ `console.error`

### 9.3 UI
- **Design tokens** (`styles/main.css`) ใช้ชื่อตัวแปรมาตรฐานของ shadcn-vue:

| Token | ค่า | ใช้กับ |
|---|---|---|
| `--primary` / `--primary-foreground` | `#C2410C` / ขาว | ปุ่มหลัก, เลขคิว, active |
| `--accent` / `--accent-foreground` | `#F5B83D` / `#1C1917` | ป้าย "กำลังทำ" |
| `--background` / `--card` | `#F5F5F4` / ขาว | พื้นหลัง / การ์ด |
| `--foreground` / `--muted-foreground` | `#1C1917` / `#57534E` | ตัวอักษร |
| `--border` | `#E7E5E4` | เส้น |
| `--success` | `#15803D` | รายการเสร็จ |
| `--destructive` | แดง | error แสดงคู่กับไอคอนและข้อความเสมอ ไม่ใช้สีอย่างเดียว |

- **shadcn-vue ที่ใช้:** Button, Input, Textarea, Label, Card, Badge, Tabs, Checkbox, Switch, RadioGroup, Skeleton, Sonner, Form
- **Component ของแอป:** ทุกตัวรับ props และส่ง emit เท่านั้น
  - ใช้ร่วม: `ImageWithFallback`, `ImageUploadField`, `PriceTag`, `EmptyState`, `ErrorState`, `BottomNav`, `TopNav`, `AppLogo`
  - `shops`: `ShopCard`, `MenuItemCard`, `QuantityStepper`
  - `cart`: `CartGroup`
  - `orders`: `QueueTicket`
  - `merchant`: `MerchantSidebar`, `OrderCard`, `ShopForm`, `ProductForm`
- **Accessibility:** ปุ่มและ target สูงอย่างน้อย 44px, focus ring เห็นชัด, ปุ่มไอคอนมี `aria-label`, contrast ผ่าน WCAG AA, `lang="th"`
- **Feedback:** Skeleton ตอนโหลด, EmptyState (ไม่มีร้าน / ตะกร้าว่าง / ยังไม่มีคิว / ร้านยังไม่มีเมนู), toast หลัง mutation

### 9.4 Trade-off ที่ตั้งใจเลือก
- **Token ใน `localStorage`:** API ออกแบบเป็น Bearer token ไว้แล้ว ข้อเสียคือถ้าโดน XSS จะถูกขโมย token ได้ ทางที่ปลอดภัยกว่าคือ httpOnly cookie แต่ต้องแก้ API จึงไม่ทำในเฟสนี้ ส่วนที่ลดความเสี่ยงได้คือ Vue escape ข้อความให้อยู่แล้ว ห้ามใช้ `v-html` กับข้อมูลจากผู้ใช้ และให้ nginx ส่ง CSP header
- **Polling 15 วินาที:** ไม่ realtime จริงแต่ไม่ต้องแก้ API จะแทนด้วย Socket.IO ในเฟส 3

## 10. รูป

- **Seed:** เปลี่ยนไฟล์ใน `apps/api/seed/images/` (shop-1..5, product-1..5) เป็นรูปอาหารจริงจาก Unsplash หรือ Pexels
  - ผมหาตัวเลือกให้เจ้าของ repo เลือกก่อนใส่
  - บันทึกที่มาและ license ใน `apps/api/seed/images/CREDITS.md`
  - ชื่อไฟล์ใน `seed-data.ts` เปลี่ยนตามนามสกุลใหม่ได้ ไม่แก้โค้ดส่วนอื่นของ API
- **`ImageWithFallback`:**
  - กำหนดอัตราส่วนไว้ตายตัว (การ์ดร้าน 16:10, เมนู 1:1, รูปปกร้าน 16:9) และใช้ `object-cover`
  - ใช้ `loading="lazy"` ถ้ารูปเสียหรือไม่มีรูป แสดงกล่องสีพร้อมไอคอน
- **`ImageUploadField`:**
  - แสดงตัวอย่างรูปก่อนส่ง
  - เช็คชนิดไฟล์ (JPEG, PNG, WebP, AVIF, GIF ตาม API) และขนาด (`VITE_UPLOAD_MAX_MB` ค่าเริ่มต้น 5 ตรงกับ API) ตั้งแต่ฝั่ง client

## 11. Dev, Docker และ CI

- **Dev:**
  - Vite proxy `/api` และ `/uploads` ไปที่ `VITE_API_PROXY_TARGET` (ค่าเริ่มต้น `http://localhost:3000`) ฝั่ง browser จึงเห็นเป็น origin เดียวกัน ไม่ต้องแก้ CORP ของ helmet (ปิดเรื่องที่ค้างใน `phase1-followups.md`)
  - `pnpm dev` ที่ root รัน api และ web พร้อมกัน
- **Docker:**
  - `apps/web/Dockerfile` build แบบ multi-stage แล้วใช้ nginx เสิร์ฟ `dist/` พร้อม SPA fallback ไป `index.html`
  - nginx proxy `/api` และ `/uploads` ไปที่ `api:3000` และส่ง security header (CSP, `X-Content-Type-Options`)
  - compose เพิ่ม service `web` (port 8080) ที่ depends on `api` ทำให้ `docker compose up` เปิดใช้ได้ทั้งระบบที่ `http://localhost:8080`
- **Root scripts:** `typecheck` ของ web ใช้ `vue-tsc --noEmit` ส่วน `test` ที่ root รวม `apps/web` ผ่าน `projects` ใน `vitest.config.ts` อยู่แล้ว
- **CI:** เพิ่มขั้น `pnpm build` ต่อจาก test

## 12. Testing

| ระดับ | เครื่องมือ | ครอบคลุม |
|---|---|---|
| Unit | Vitest | `api-client` (แนบ token, แปลง error, Zod parse, FormData), `error-messages`, `format`, store `auth` (ready, login, logout, 401), router guard ทุกกรณีในข้อ 9.1, `useShopCartDraft` (debounce, ส่งทีละ request, rollback) |
| Component | Vue Test Utils | `QuantityStepper`, `QueueTicket`, `OrderCard`, `ImageUploadField`, `MenuItemCard` (สถานะหมด) |
| Flow ของหน้า | Vue Test Utils + MSW | login → redirect ตาม role, signup ได้ 409 → error ใต้ช่อง, เพิ่มตะกร้า → สั่ง → ไป `/orders`, แม่ค้าติ๊กรายการ + เสร็จทั้งออเดอร์, สร้างร้าน → ไป `/merchant/queue` |

- handler ของ MSW คืนข้อมูลที่ผ่าน schema ของ `@canteen/shared` เพื่อไม่ให้ข้อมูลจำลองหลุดจาก contract จริง
- test ของ web ไม่ต้องใช้ database

## 13. ไฟล์ที่ลบหรือเปลี่ยน
- ลบ `myfrontend/` ทั้งโฟลเดอร์ หลังผ่านรายการในข้อ 14
- เปลี่ยนรูปใน `apps/api/seed/images/` และเพิ่ม `CREDITS.md`
- `docker-compose.yml`: เพิ่ม service `web`
- `.github/workflows/ci.yml`: เพิ่มขั้น build
- `eslint.config.js`: เพิ่ม config ของ Vue
- `package.json` ที่ root: `dev` รัน api และ web พร้อมกัน
- `README.md`: อัปเดตส่วน Development (`pnpm dev`, `docker compose up` แล้วเปิด `:8080`)
- `docs/superpowers/phase1-followups.md`: ทำเครื่องหมายว่าเรื่อง CORP และ ECONNRESET จบแล้ว

## 14. รายการฟีเจอร์ที่ต้องเท่าเดิม (เทียบกับ `myfrontend/`)

| ฟีเจอร์เดิม | หน้าใหม่ |
|---|---|
| ดูรายการร้าน + ค้นหา | `/` |
| ดูร้าน + เมนู, เลือกจำนวนแล้วใส่ตะกร้า | `/shops/:id` |
| แม่ค้าเปิด/ปิดขายเมนูจากหน้าร้าน | ย้ายไป `/merchant/menu` |
| สมัคร (เลือก customer / merchant), login, logout | `/signup`, `/login`, `/account` |
| ตะกร้า: เพิ่ม/ลดจำนวน, ลบ, สั่งทีละร้าน | `/cart` |
| ดูคิวของฉัน | `/orders` |
| สร้างร้าน, แก้ร้าน | `/merchant/shop/new`, `/merchant/shop` |
| สร้างเมนู, แก้เมนู | `/merchant/menu/new`, `/merchant/menu/:id/edit` |
| จัดการคิว: ติ๊กรายการ, เปลี่ยนสถานะออเดอร์ | `/merchant/queue` |

## 15. เกณฑ์ตรวจรับเฟส 2
1. ทุกแถวในข้อ 14 ทำได้จริงบน `docker compose up` ที่ `http://localhost:8080` ด้วยบัญชี demo (`customer1`, `merchant1`–`merchant5`)
2. ใช้งานได้ที่ความกว้าง 375px (ลูกค้า) และ 1024px ขึ้นไป (แม่ค้า) โดยไม่มี scroll แนวนอน
3. รูปจาก `/uploads` แสดงได้ทั้งตอน dev (`:5173`) และใน Docker (`:8080`)
4. `pnpm lint`, `pnpm typecheck`, `pnpm test` และ `pnpm build` ผ่าน
5. ไม่มีไฟล์ใน `apps/api/src` ถูกแก้ ยกเว้นชื่อไฟล์รูปใน `apps/api/src/db/seed-data.ts`
6. ลบ `myfrontend/` แล้ว และ README อัปเดตแล้ว
7. ก่อน merge เข้า `master` และติด tag `v1-legacy` ต้องถามเจ้าของ repo ก่อน

## 16. ความเสี่ยง
- **shadcn-vue กับ Tailwind v4 และ TypeScript 6.0:** CLI ของ shadcn-vue อาจยังไม่รองรับทุกเวอร์ชัน ตอนเขียน plan ต้องเช็คก่อน ถ้าไม่ได้ให้ copy component เข้ามาเองตาม registry
- **`vue-tsc` กับ TypeScript 6.0:** ถ้ายังไม่รองรับ ให้ pin TypeScript ของ `apps/web` ตามที่ `vue-tsc` รองรับ และบันทึกเหตุผลไว้
- **การ์ดที่รูปยาวสั้นไม่เท่ากัน:** รูปที่แม่ค้าอัปโหลดมีอัตราส่วนหลากหลาย จึงใช้กล่องอัตราส่วนตายตัวกับ `object-cover` ส่วนที่ถูกครอปถือว่ายอมรับได้
- **Polling เพิ่มโหลดให้ API:** 1 request ต่อ 15 วินาทีต่อแท็บที่เปิดหน้าคิวอยู่ ถือว่ารับได้สำหรับ demo
