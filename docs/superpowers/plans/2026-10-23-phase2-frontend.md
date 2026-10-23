# Phase 2 Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้าง `apps/web` ด้วย Vue 3 + TS + Tailwind + shadcn-vue ให้ใช้ API เฟส 1 ได้ครบทุก flow ตามดีไซน์แบบ food delivery สีส้มพริก แล้วลบ `myfrontend/`

**Architecture:**
- **โครงสร้าง:** แบ่งตามฟีเจอร์ (`features/*`) ในแต่ละฟีเจอร์ไหลตามลำดับ pages → components / queries → api → `lib/api-client`
- **State:** ข้อมูลจาก server ใช้ TanStack Vue Query ส่วน Pinia มีแค่ store `auth`
- **Contract:** type และ schema ทั้งหมดมาจาก `@canteen/shared`
- **Test:** Vitest + Vue Test Utils + MSW (จำลอง API ที่ระดับ network ไม่ต้องใช้ DB)

**Tech Stack:**
- **Frontend:** Vue 3.5, Vite 8, Vue Router 5, Pinia 4, TanStack Vue Query 5
- **UI:** Tailwind CSS 4, shadcn-vue (Reka UI), `@lucide/vue`, vee-validate 4, vue-sonner
- **Test:** Vitest 5, Vue Test Utils, MSW 3, jsdom
- **Infra:** nginx (Docker), GitHub Actions

**Spec:** `docs/superpowers/specs/2026-10-23-phase2-frontend-design.md` (อ่านคู่กับ plan นี้เสมอ)

### ปรับจาก spec (เหตุผลจากการตรวจเวอร์ชันจริง)
1. **`@lucide/vue` แทน `lucide-vue-next`:** `lucide-vue-next` ถูก deprecate แล้ว component ที่ CLI ของ shadcn-vue สร้างมาต้องเปลี่ยน import เป็น `@lucide/vue`
2. **ไม่ใช้ `@vee-validate/zod`:** รองรับแค่ `zod ^3` แต่โปรเจกต์ใช้ Zod 4 จึงเขียน adapter เองที่ `lib/form-schema.ts` (ประมาณ 20 บรรทัด และ test ได้)
3. **ข้อความ validation ภาษาไทย:**
   - ใช้ `z.config(z.locales.th())` (Zod 4.6 มี locale `th`)
   - แปลข้อความ custom ภาษาอังกฤษที่อยู่ใน `@canteen/shared` และ API ผ่านตารางใน `lib/error-messages.ts`
4. **สมัครเสร็จแล้ว login ให้อัตโนมัติ:** spec ไม่ได้ระบุ เลือกแบบนี้เพราะผู้ใช้ไม่ต้องพิมพ์รหัสซ้ำ
5. **Docker:** nginx ใน container ฟัง port 80 แล้ว map ออกมาเป็น `8080:80`
6. **เวอร์ชัน major ใหม่:** Vue Router 5, Pinia 4, MSW 3 และ Vite 8 ทั้งหมดเป็นเวอร์ชัน stable ล่าสุดและ peer dependency เข้ากันกับ Node 24 และ TypeScript 6.0 (ตรวจแล้ว)

## Prerequisites
- **PATH:** ทุกคำสั่ง shell ต้องขึ้นต้นด้วย `export PATH="/c/Users/aumptp/AppData/Roaming/fnm/node-versions/v24.22.1/installation:$PATH"` (Node 24 ผ่าน fnm ส่วน Node ของระบบยังเป็น 22)
- **Docker Desktop:** ต้องเปิดอยู่ ให้ service `db` และ `api` รันอยู่ตอนทำ Task 14

## Global Constraints

- **เวอร์ชัน dependency ของ `apps/web`:** ใช้ caret range ตามนี้ (lockfile เป็นตัวล็อกจริง)
  - **Runtime:**
    - Framework: `vue ^3.5.40`, `vue-router ^5.4.0`, `pinia ^4.1.0`, `@tanstack/vue-query ^5.104.0`, `zod ^4.6.7`, `@canteen/shared workspace:*`
    - UI: `reka-ui ^2.11.0`, `@lucide/vue ^1.61.0`, `vee-validate ^4.15.1`, `vue-sonner ^2.0.9`, `@vueuse/core ^15.0.0`
    - Utility ของ class: `class-variance-authority ^0.7.1`, `clsx ^2.1.1`, `tailwind-merge ^3.7.0`
    - Font: `@fontsource/prompt ^5.3.0`, `@fontsource/noto-sans-thai ^5.3.0`
  - **Dev:**
    - Build: `vite ^8.3.0`, `@vitejs/plugin-vue ^6.0.10`, `tailwindcss ^4.3.3`, `@tailwindcss/vite ^4.3.3`, `tw-animate-css ^1.4.0`
    - Typecheck: `vue-tsc ^3.3.13`
    - Test: `@vue/test-utils ^2.5.1`, `msw ^3.0.3`, `jsdom ^30.1.3`
  - **Root devDependencies เพิ่ม:** `eslint-plugin-vue ^10.11.1`, `vue-eslint-parser ^10.4.1`
  - **ห้ามใช้:** `axios` (ใช้ `fetch`), `lucide-vue-next`, `@vee-validate/zod`, `vuex`
- **TypeScript:** strict, ห้าม `any`, ห้ามประกาศ type ของ request/response ซ้ำกับ `@canteen/shared`
- **Prettier:** `singleQuote: true`, `semi: false`, `printWidth: 100` (ใช้ `.prettierrc` ของ root)
- **ภาษา:** ข้อความบนหน้าจอทั้งหมดเป็นภาษาไทย, ชื่อแอป "Canteen", `<html lang="th">`
- **Design tokens:**
  - `--primary #C2410C` / `--primary-foreground #FFFFFF`
  - `--accent #F5B83D` / `--accent-foreground #1C1917`
  - `--background #F5F5F4`, `--card #FFFFFF`
  - `--foreground #1C1917`, `--muted-foreground #57534E`
  - `--border #E7E5E4`, `--success #15803D`, `--destructive #B91C1C`
- **ฟอนต์:** Prompt (หัวข้อ, `font-heading`) และ Noto Sans Thai (เนื้อหา, `font-sans`) ผ่าน `@fontsource` เท่านั้น
- **Breakpoints:**
  - ลูกค้า: ต่ำกว่า `md` (768px) ใช้แถบเมนูล่าง ตั้งแต่ `md` ขึ้นไปใช้ top nav
  - แม่ค้า: ตั้งแต่ `lg` (1024px) ขึ้นไปมี sidebar
- **Accessibility:** target ที่กดได้สูงอย่างน้อย 44px (`min-h-11`), ปุ่มไอคอนต้องมี `aria-label`, ห้ามใช้ `v-html` กับข้อมูลจากผู้ใช้
- **รูป:**
  - ชนิดที่รับ: `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `image/gif`
  - ขนาดไม่เกิน `VITE_UPLOAD_MAX_MB` (default `5`)
  - อัตราส่วน: การ์ดร้าน 16:10, เมนู 1:1, ปกร้าน 16:9
- **ค่าคงที่:** `DEBOUNCE_MS = 300`, `QUEUE_REFETCH_MS = 15_000`, `staleTime 30_000`, key ของ token `canteen.token`
- **ห้ามแตะ:**
  - `apps/api/src/**` ยกเว้นชื่อไฟล์รูปใน `apps/api/src/db/seed-data.ts` (Task 13)
  - `myfrontend/` จนถึง Task 14
  - MySQL93 ในเครื่อง (port 3306)
- **Git:** ใช้ Conventional Commits บน branch `refactor/architecture` และ **ห้าม push**

## Review Focus

1. **Session หมดอายุระหว่างใช้งาน:**
   - ถ้า token ถูกลบฝั่ง server แล้วผู้ใช้กดอะไรสักอย่างจนได้ 401 ต้องไป `/login?redirect=<หน้าเดิม>`
   - cache ของคนเดิมต้องหายหมด login คนใหม่ต้องไม่เห็นตะกร้าคนเก่า
   - test อยู่ใน Task 3 และ Task 4
2. **`?redirect=` ที่ไม่ปลอดภัย:** ค่าอย่าง `//evil.com`, `https://evil.com` หรือ `javascript:` ต้องพาไปหน้าแรก ส่วนค่าปกติ เช่น `/shops/3` ต้องกลับไปที่เดิมหลัง login (test อยู่ใน Task 4 และ Task 5)
3. **Poll กลับมาทับค่า optimistic:** แม่ค้าติ๊กรายการขณะที่ refetch ทุก 15 วินาทีกำลังกลับมา ค่าที่ติ๊กต้องไม่เด้งกลับ ต้องเรียก `cancelQueries` ใน `onMutate` (test อยู่ใน Task 10)
4. **รูปไม่ผ่านเงื่อนไข:**
   - ไฟล์เกิน 5 MB หรือชนิดไม่รองรับต้องถูกบล็อกตั้งแต่ client พร้อมข้อความไทย
   - ถ้า server ตอบ 400 ที่ path `image` ต้องแสดงใต้ช่องรูป
   - test อยู่ใน Task 6 และ Task 11
5. **หน้าที่ไม่มีข้อมูล:**
   - ค้นหาแล้วไม่เจอร้าน, ร้านที่ยังไม่มีเมนู, ตะกร้าว่าง และยังไม่มีคิว ต้องแสดง EmptyState ไม่ใช่หน้าว่าง
   - `/shops/9999` ต้องแสดง Not Found
   - test อยู่ใน Task 7, Task 8 และ Task 9

## File Structure

```
apps/web/
├─ package.json, index.html, vite.config.ts, vitest.config.ts, tsconfig.json, components.json, env.d.ts
├─ Dockerfile, nginx.conf                                   (Task 12)
├─ tests/
│  ├─ setup.ts                                              (Task 3)
│  ├─ msw/server.ts, msw/handlers.ts                        (Task 3)
│  ├─ fixtures.ts                                           (Task 3)
│  └─ mount-app.ts                                          (Task 4)
└─ src/
   ├─ main.ts, App.vue                                      (Task 1, 4)
   ├─ styles/main.css                                       (Task 1)
   ├─ lib/utils.ts (cn)                                     (Task 1)
   ├─ lib/api-error.ts, api-client.ts, token-storage.ts     (Task 2)
   ├─ lib/error-messages.ts, form-schema.ts, form-errors.ts (Task 2)
   ├─ lib/format.ts, form-data.ts                           (Task 2)
   ├─ lib/query-client.ts, query-keys.ts                    (Task 3)
   ├─ router/index.ts, routes.ts, guards.ts                 (Task 4)
   ├─ layouts/CustomerLayout.vue, MerchantLayout.vue, AuthLayout.vue (Task 4)
   ├─ components/ui/*                                       (Task 1, shadcn-vue)
   ├─ components/AppLogo, BottomNav, TopNav, PriceTag, EmptyState, ErrorState, ImageWithFallback (Task 4)
   ├─ components/ImageUploadField.vue                       (Task 6)
   ├─ pages/NotFoundPage.vue                                (Task 4)
   └─ features/
      ├─ auth/    api.ts, store.ts, setup.ts, redirect.ts, pages/{Login,Signup,Account}Page.vue (Task 3, 5)
      ├─ shops/   api.ts, queries.ts, components/{ShopCard,MenuItemCard,QuantityStepper}.vue, pages/{Home,Shop}Page.vue (Task 7, 8)
      ├─ cart/    api.ts, queries.ts, composables/useShopCartDraft.ts, components/CartGroup.vue, pages/CartPage.vue (Task 8, 9)
      ├─ orders/  api.ts, queries.ts, components/QueueTicket.vue, pages/MyOrdersPage.vue (Task 9)
      └─ merchant/ api.ts, queries.ts, components/{MerchantSidebar,OrderCard,ShopForm,ProductForm}.vue,
                   pages/{Queue,Menu,ProductEdit,ShopEdit,ShopCreate}Page.vue (Task 10, 11)
```

แต่ละ feature มี `index.ts` ที่ export เฉพาะของที่ feature อื่นใช้ได้ (กฎข้อ 6 ของ spec) ส่วน test วางคู่กับไฟล์ (`*.test.ts`) หรือไว้ใน `apps/web/tests/` ถ้าเป็น flow ข้ามหน้า

---

### Task 1: Scaffold `apps/web`, tooling และ design tokens

**Files:**
- Create:
  - `apps/web/{package.json,index.html,vite.config.ts,vitest.config.ts,tsconfig.json,env.d.ts,components.json}`
  - `apps/web/src/{main.ts,App.vue,styles/main.css,lib/utils.ts,App.test.ts}`
  - `apps/web/src/components/ui/*` จาก shadcn-vue
- Modify: `eslint.config.js`, root `package.json` (`dev`, devDependencies), `.gitignore` (ถ้ายังไม่ครอบ `apps/web/dist`)

**Interfaces:**
- Produces:
  - package ชื่อ `@canteen/web` (`"type": "module"`, `"private": true`)
  - scripts: `dev` = `vite`, `build` = `vite build`, `preview` = `vite preview`, `typecheck` = `vue-tsc -p . --noEmit`
  - alias `@/` → `apps/web/src/` (ใน `vite.config.ts`, `vitest.config.ts` และ `tsconfig.json` `paths`)
  - `cn(...inputs: ClassValue[]): string` ใน `src/lib/utils.ts` (clsx + tailwind-merge ตามแบบ shadcn)
  - component ใน `components/ui/`: Button, Input, Textarea, Label, Card, Badge, Tabs, Checkbox, Switch, RadioGroup, Skeleton, Sonner, Form
  - utility class `font-heading` (Prompt) และ `font-sans` (Noto Sans Thai), สีจาก token ใช้เป็น class ได้ เช่น `bg-primary`, `text-muted-foreground`, `text-success`

- [ ] **Step 1: สร้าง package และ config**
  - **`vite.config.ts`:**
    - plugins `vue()` และ `tailwindcss()`, alias `@`
    - `server.proxy` ส่ง `/api` และ `/uploads` ไปที่ `process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000'`
  - **`vitest.config.ts`:**
    - plugin `vue()`, alias `@`, `environment: 'jsdom'`, `globals: true`
    - `include: ['src/**/*.test.ts', 'tests/**/*.test.ts']`
    - `setupFiles: ['./tests/setup.ts']` (ใน task นี้สร้างไฟล์ว่างไว้ก่อน Task 3 จะเติม)
  - **`tsconfig.json`:**
    - extends `../../tsconfig.base.json`
    - `lib: ["ES2023","DOM","DOM.Iterable"]`, `types: ["node","vite/client","vitest/globals"]`
    - `paths: { "@/*": ["./src/*"] }`
    - include `src`, `tests`, `env.d.ts`, `*.config.ts`
  - **`env.d.ts`:**
    - `/// <reference types="vite/client" />`
    - declare `*.vue`
    - `ImportMetaEnv` มี `VITE_UPLOAD_MAX_MB?: string`
  - **`index.html`:** `lang="th"`, `<title>Canteen</title>`
- [ ] **Step 2: Tailwind และ design tokens ใน `src/styles/main.css`**
  - `@import "tailwindcss"` และ `@import "tw-animate-css"`
  - import ฟอนต์ `@fontsource/prompt/{500,600}.css` และ `@fontsource/noto-sans-thai/{400,500,600}.css`
  - ตั้งตัวแปร token ทั้งหมดใน Global Constraints ไว้ใน `:root` แล้ว map เป็นสีของ Tailwind ด้วย `@theme inline` (รวม `--color-success`)
  - ตั้ง `--font-sans` และ `--font-heading`
  - ตั้ง `--radius: 0.75rem`
  - `body` ใช้ `bg-background text-foreground font-sans`
- [ ] **Step 3: เพิ่ม component ของ shadcn-vue**
  - เขียน `components.json` เอง: style `new-york`, `typescript: true`, `tailwind.css: src/styles/main.css`, `baseColor: stone`, `cssVariables: true`, `iconLibrary: lucide`, aliases `@/components`, `@/components/ui`, `@/lib/utils`
  - รัน `pnpm --filter @canteen/web exec shadcn-vue@2.8.2 add button input textarea label card badge tabs checkbox switch radio-group skeleton sonner form` (ถ้าต้องใช้ dlx ให้รัน `pnpm dlx shadcn-vue@2.8.2 add ... --cwd apps/web`)
  - เปลี่ยนทุก import จาก `lucide-vue-next` เป็น `@lucide/vue`
  - **ถ้า CLI ใช้ไม่ได้กับ TS 6 หรือ pnpm 12:** copy source ของแต่ละ component จาก registry ของ shadcn-vue (style new-york) มาวางเอง แล้วบันทึกเหตุผลไว้ในข้อความ commit
  - **ห้ามแก้ token ที่ CLI เขียนทับ:** ถ้า CLI แก้ `main.css` ให้คืนค่าเป็น token ตาม Global Constraints
- [ ] **Step 4: ESLint ของ root**
  - เพิ่ม `...pluginVue.configs['flat/recommended']`
  - block สำหรับ `apps/web/**/*.{ts,vue}`: `languageOptions.parserOptions.parser = tseslint.parser`, `extraFileExtensions: ['.vue']`, `globals: globals.browser`
  - ปิด `vue/multi-word-component-names`
  - Prettier เป็นตัวจัดรูปแบบ จึงปิดกฎเรื่อง formatting ของ eslint-plugin-vue ที่ขัดกับ Prettier (เช่น `vue/max-attributes-per-line`, `vue/singleline-html-element-content-newline`, `vue/html-self-closing`, `vue/html-indent`)
- [ ] **Step 5: root scripts:** `"dev": "pnpm --parallel --filter @canteen/api --filter @canteen/web dev"`
- [ ] **Step 6: เขียน smoke test ที่ต้อง fail ก่อน**

```ts
// apps/web/src/App.test.ts
test('renders the app shell', () => {
  const wrapper = mount(App, { global: { stubs: { RouterView: true } } })
  expect(wrapper.exists()).toBe(true)
})
```
  - `App.vue` ตอนนี้มีแค่ `<RouterView />` และ `<Toaster />` ส่วน `main.ts` สร้างแอปและ import `./styles/main.css` ก่อน (router และ store จะเพิ่มใน Task 3–4)
- [ ] **Step 7: ตรวจ:**
  - `pnpm install`
  - `pnpm lint`, `pnpm typecheck`, `pnpm --filter @canteen/web build` ต้องผ่าน
  - `pnpm vitest run --project @canteen/web` ต้องผ่าน (ถ้าชื่อ project ไม่ตรง ให้ใช้ `pnpm --filter @canteen/web exec vitest run`)
  - **ถ้า `vue-tsc` ใช้กับ TypeScript 6.0 ไม่ได้:** pin `typescript` ใน `apps/web` ตามที่ `vue-tsc` รองรับ แล้วเขียนเหตุผลไว้ในข้อความ commit (ความเสี่ยงข้อ 16 ของ spec)
- [ ] **Step 8: Commit** `feat(web): scaffold vue app with tailwind tokens and shadcn-vue`

### Task 2: lib พื้นฐาน (api-client, error, format, form)

**Files:**
- Create:
  - `apps/web/src/lib/{api-error.ts,api-client.ts,token-storage.ts,error-messages.ts,form-schema.ts,form-errors.ts,format.ts,form-data.ts}`
  - test คู่กันทุกไฟล์ (`*.test.ts`)

**Interfaces:**
- Produces (`api-error.ts`):
  - `type ClientErrorCode = ErrorCode | 'NETWORK_ERROR' | 'INVALID_RESPONSE'`
  - `type ErrorDetail = { path: string; message: string }`
  - `class ApiError extends Error { readonly status: number; readonly code: ClientErrorCode; readonly details?: ErrorDetail[] }` โดย `status` เป็น `0` สำหรับ `NETWORK_ERROR`
  - `isApiError(value: unknown): value is ApiError`
- Produces (`token-storage.ts`):
  - `getToken(): string | null`, `setToken(token: string): void`, `clearToken(): void`
  - ใช้ key `canteen.token` และหุ้มทุกครั้งที่เรียก `localStorage` ด้วย try/catch
- Produces (`api-client.ts`):
  - `configureApiClient(options: { getToken?: () => string | null; onUnauthorized?: () => void }): void`
  - `type RequestOptions<T> = { schema: z.ZodType<T>; body?: unknown; query?: Record<string, string | number | undefined>; authRedirect?: boolean }`
  - `request<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, options: RequestOptions<T>): Promise<T>`
  - shortcut: `api.get`, `api.post`, `api.put`, `api.patch`, `api.delete` รับ `(path, options)`
- Produces (`error-messages.ts`):
  - `errorMessage(error: unknown, overrides?: Partial<Record<ClientErrorCode, string>>): string`
  - `translateValidationMessage(message: string, fallback?: string): string` คืนคำแปลจากตาราง ถ้าไม่มีในตารางคืน `fallback ?? message`
  - `FALLBACK_ERROR_MESSAGE = 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง'`
- Produces (`form-schema.ts`):
  - `toFormSchema<S extends z.ZodType>(schema: S): TypedSchema<z.input<S>, z.output<S>>` (type `TypedSchema` มาจาก `vee-validate`)
- Produces (`form-errors.ts`):
  - `applyServerErrors(error: unknown, setFieldError: (field: string, message: string) => void, fields: readonly string[]): string | null`
  - คืนค่าเป็นข้อความรวมที่จะแสดงบนฟอร์ม หรือ `null` ถ้าทุก error ลงช่องได้หมด
- Produces (`format.ts`): `formatPrice(value: number): string`, `formatTime(iso: string): string`
- Produces (`form-data.ts`): `toFormData(fields: Record<string, string | number>, image: File | null): FormData` ใส่รูปใน field ชื่อ `image` เฉพาะตอนที่มีรูป

**พฤติกรรมที่ test ต้องครอบคลุม (`api-client`):**
- **URL:** ประกอบด้วย `new URL(path, window.location.origin)` แล้วใส่ query โดยข้ามค่าที่เป็น `undefined`
- **Token:** ถ้ามีให้แนบ `Authorization: Bearer <token>`
- **Body:**
  - object ส่งเป็น JSON พร้อม `Content-Type: application/json`
  - `FormData` ส่งตรงๆ โดยไม่ตั้ง `Content-Type`
- **204:** ใช้ `null` แทน body แล้วส่งให้ schema parse (endpoint ที่ตอบ 204 จึงต้องใช้ `z.null()` หรือ `schema.nullable()`)
- **error ที่มี body ตาม `errorResponseSchema`:** โยน `ApiError(status, code, message, details)`
- **error ที่ body ไม่ตรง format:** โยน `ApiError(status, 'INTERNAL_ERROR', ...)`
- **fetch reject:** โยน `ApiError(0, 'NETWORK_ERROR', ...)`
- **response ไม่ผ่าน schema หรือไม่ใช่ JSON:** โยน `ApiError(status, 'INVALID_RESPONSE', ...)`
- **401:** เรียก `onUnauthorized()` เฉพาะเมื่อ request แนบ token ไปและ `authRedirect !== false` แล้วยังโยน error ต่อ

- [ ] **Step 1: เขียน test ที่ต้อง fail** (ใช้ `vi.stubGlobal('fetch', vi.fn())` ในไฟล์นี้ ส่วน MSW เริ่มใช้ตั้งแต่ Task 3)

```ts
// api-client.test.ts
test('sends bearer token and parses the response with the schema', async () => {
  configureApiClient({ getToken: () => 'tok' })
  fetchMock.mockResolvedValue(json(200, { status: 'ok' }))
  await expect(api.get('/api/health', { schema: z.object({ status: z.literal('ok') }) })).resolves.toEqual({ status: 'ok' })
  expect(lastRequest().headers.get('Authorization')).toBe('Bearer tok')
})
test('omits undefined query values', ...)                 // { search: undefined } → ไม่มี ?search=
test('passes FormData through without a content-type', ...)
test('204 resolves to null', ...)                          // schema z.null()
test('maps an error body to ApiError with details', async () => {
  fetchMock.mockResolvedValue(json(400, { error: { code: 'VALIDATION_ERROR', message: 'Invalid', details: [{ path: 'name', message: 'Required' }] } }))
  await expect(api.post('/api/shops', { schema: z.unknown(), body: {} })).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR', details: [{ path: 'name', message: 'Required' }] })
})
test('network failure becomes NETWORK_ERROR with status 0', ...)
test('schema mismatch becomes INVALID_RESPONSE', ...)
test('401 with a token calls onUnauthorized; authRedirect:false does not', ...)
test('401 without a token does not call onUnauthorized', ...)

// error-messages.test.ts
test('maps codes to Thai', () => {
  expect(errorMessage(new ApiError(429, 'RATE_LIMITED', 'x'))).toBe('ลองใหม่อีกครั้งในอีกสักครู่')
  expect(errorMessage(new ApiError(0, 'NETWORK_ERROR', 'x'))).toBe('เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้ง')
  expect(errorMessage(new Error('boom'))).toBe(FALLBACK_ERROR_MESSAGE)
})
test('overrides win', () => {
  expect(errorMessage(new ApiError(409, 'CONFLICT', 'x'), { CONFLICT: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' })).toBe('ชื่อผู้ใช้นี้ถูกใช้แล้ว')
})
test('translates known custom messages and keeps unknown ones', () => {
  expect(translateValidationMessage('Passwords do not match')).toBe('รหัสผ่านไม่ตรงกัน')
  expect(translateValidationMessage('ข้อความไทยจาก locale')).toBe('ข้อความไทยจาก locale')
})

// form-schema.test.ts
test('returns parsed value on success', ...)               // coerce price '45' → 45
test('groups issues by dotted path and translates them', async () => {
  const r = await toFormSchema(signupSchema).parse({ ...validSignup, confirmPassword: 'x' })
  expect(r.errors).toContainEqual({ path: 'confirmPassword', errors: ['รหัสผ่านไม่ตรงกัน'] })
})

// form-errors.test.ts
test('routes known paths to fields and returns null', ...)
test('returns a general message for unknown paths or non-validation errors', ...)
test('server detail messages are translated, unknown ones become "ข้อมูลไม่ถูกต้อง"', ...)

// format.test.ts
test('formatPrice', () => {
  expect(formatPrice(50)).toBe('฿50')
  expect(formatPrice(1234.5)).toBe('฿1,234.50')
})
test('formatTime renders HH:mm in 24h', ...)               // ใช้ TZ จาก process.env.TZ='Asia/Bangkok' ใน test
```

- [ ] **Step 2: รัน `pnpm --filter @canteen/web exec vitest run src/lib` ต้อง FAIL**
- [ ] **Step 3: Implement**
  - **ตารางข้อความใน `error-messages.ts`:**
    - `VALIDATION_ERROR` 'ข้อมูลไม่ถูกต้อง'
    - `UNAUTHORIZED` 'กรุณาเข้าสู่ระบบ'
    - `FORBIDDEN` 'ไม่มีสิทธิ์ทำรายการนี้'
    - `NOT_FOUND` 'ไม่พบข้อมูล'
    - `CONFLICT` 'ข้อมูลซ้ำกับที่มีอยู่'
    - `RATE_LIMITED` 'ลองใหม่อีกครั้งในอีกสักครู่'
    - `INTERNAL_ERROR` 'ระบบขัดข้อง ลองใหม่อีกครั้ง'
    - `NETWORK_ERROR` 'เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้ง'
    - `INVALID_RESPONSE` 'ระบบขัดข้อง ลองใหม่อีกครั้ง'
  - **ตารางแปลข้อความ custom:**
    - 'Password must be at least 8 characters' → 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
    - 'Password must contain a lowercase letter' → 'รหัสผ่านต้องมีตัวพิมพ์เล็ก'
    - 'Password must contain an uppercase letter' → 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่'
    - 'Password must contain a digit' → 'รหัสผ่านต้องมีตัวเลข'
    - 'Mobile must be 10 digits starting with 0' → 'เบอร์มือถือต้องเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0'
    - 'Passwords do not match' → 'รหัสผ่านไม่ตรงกัน'
    - 'Image is required' → 'กรุณาเลือกรูป'
    - 'Image must be a JPEG, PNG, WebP, AVIF or GIF file' → 'รองรับเฉพาะไฟล์ JPEG, PNG, WebP, AVIF หรือ GIF'
  - **`toFormSchema`:** คืน object `{ __type: 'VVTypedSchema', async parse(values) }` ที่เรียก `safeParseAsync` แล้วรวม issue ตาม `path.join('.')` และส่งข้อความผ่าน `translateValidationMessage`
  - **`applyServerErrors`:** detail ที่ `path` อยู่ใน `fields` ให้แปลด้วย `translateValidationMessage(message, 'ข้อมูลไม่ถูกต้อง')` เพราะข้อความจาก server เป็นภาษาอังกฤษ ส่วน detail ที่เหลือ หรือ error ที่ไม่ใช่ `VALIDATION_ERROR` ให้รวมเป็นข้อความเดียวด้วย `errorMessage`
  - **`formatPrice`:** `Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })` ถ้ามีทศนิยมให้แสดง 2 หลักเสมอ แล้วเติม `฿` ข้างหน้า
- [ ] **Step 4: รัน test ซ้ำต้อง PASS แล้วรัน `pnpm lint` และ `pnpm typecheck`**
- [ ] **Step 5: Commit** `feat(web): add api client, error mapping and form helpers`

### Task 3: Auth store, Query client และระบบ test (MSW)

**Files:**
- Create:
  - `apps/web/src/lib/{query-client.ts,query-keys.ts}`
  - `apps/web/src/features/auth/{api.ts,store.ts,store.test.ts,index.ts}`
  - `apps/web/tests/{setup.ts,fixtures.ts,msw/server.ts,msw/handlers.ts}`

**Interfaces:**
- Produces (`query-client.ts`):
  - `createQueryClient(): QueryClient` ตั้ง `staleTime: 30_000`, query ใช้ `retry: shouldRetry`, mutation ใช้ `retry: false`
  - `shouldRetry(failureCount: number, error: unknown): boolean` ได้ `false` เมื่อเป็น `ApiError` สถานะ 400–499 กรณีอื่นได้ `failureCount < 1`
  - `queryClient` เป็น singleton ที่แอปใช้
- Produces (`query-keys.ts`):

```ts
export const queryKeys = {
  shops: {
    all: ['shops'] as const,
    list: (search: string) => ['shops', 'list', { search }] as const,
    detail: (id: number) => ['shops', 'detail', id] as const,
  },
  cart: ['cart'] as const,
  orders: { mine: ['orders', 'mine'] as const, shop: ['orders', 'shop'] as const },
}
```

- Produces (`features/auth/api.ts`):
  - `login(input: LoginInput): Promise<LoginResponse>` ใช้ `authRedirect: false`
  - `signup(input: SignupInput): Promise<User>`
  - `fetchMe(): Promise<User>`
  - `logout(): Promise<void>`
- Produces (`useAuthStore`, setup store id `auth`):
  - **state:** `user: Ref<User | null>`
  - **computed:** `isLoggedIn`, `isMerchant` (role เป็น `merchant` หรือ `admin`), `hasShop` (`user.shopId !== null`)
  - **`init(): Promise<void>`:** เรียกซ้ำได้โดยคืน promise เดิม ถ้ามี token ให้เรียก `fetchMe` ถ้าได้ 401 ให้ `clearSession()` ส่วน error อื่นให้เก็บ token ไว้และตั้ง `user = null`
  - **`login(input): Promise<User>`:** เก็บ token แล้วตั้ง user
  - **`signup(input): Promise<User>`:** เรียก `signup` แล้วต่อด้วย `login({ username, password })`
  - **`logout(): Promise<void>`:** เรียก API (ถ้า error ก็ข้ามไป) แล้ว `clearSession()`
  - **`refreshMe(): Promise<void>`**
  - **`clearSession(): void`:** `clearToken()`, ตั้ง `user = null` และ `queryClient.clear()`
- Produces (test infra):
  - `tests/setup.ts`: เรียก `z.config(z.locales.th())`, `server.listen({ onUnhandledRequest: 'error' })`, และ `afterEach` ที่ `resetHandlers()`, `localStorage.clear()`, `queryClient.clear()`
  - `tests/fixtures.ts`: builder ที่ parse ผลลัพธ์ด้วย schema จริงทุกตัว ได้แก่ `makeUser(overrides?)`, `makeShop`, `makeProduct`, `makeShopDetail`, `makeCart`, `makeOrder`, `makeShopOrder`
  - `tests/msw/handlers.ts`: `defaultHandlers` (GET shops คืน 2 ร้าน, GET cart คืน `[]` และอื่นๆ) และ helper `apiUrl(path) = '*' + path`

- [ ] **Step 1: เขียน test ที่ต้อง fail (`store.test.ts`)**

```ts
test('init restores the user from a stored token', async () => {
  setToken('tok'); server.use(http.get('*/api/auth/me', () => HttpResponse.json(makeUser({ role: 'merchant', shopId: 2 }))))
  const auth = useAuthStore(); await auth.init()
  expect(auth.isMerchant).toBe(true); expect(auth.hasShop).toBe(true)
})
test('init clears a token the server rejects', ...)       // me → 401: getToken() === null, user === null
test('init is idempotent', ...)                           // เรียก 2 ครั้ง ยิง /me ครั้งเดียว
test('login stores token and user', ...)
test('signup then logs in automatically', ...)
test('logout clears token, user and query cache even if the API fails', async () => {
  queryClient.setQueryData(queryKeys.cart, [makeCart()])
  server.use(http.post('*/api/auth/logout', () => HttpResponse.error()))
  await auth.logout()
  expect(getToken()).toBeNull(); expect(queryClient.getQueryData(queryKeys.cart)).toBeUndefined()
})
test('shouldRetry never retries 4xx', ...)
```

- [ ] **Step 2: รัน test ต้อง FAIL**
- [ ] **Step 3: Implement** ตาม Interfaces (`fetchMe` และ `login` ใช้ `userSchema` และ `loginResponseSchema` จาก `@canteen/shared` ส่วน `logout` ใช้ `z.null()`)
- [ ] **Step 4: รัน test ต้อง PASS แล้วรัน `pnpm lint` และ `pnpm typecheck`**
- [ ] **Step 5: Commit** `feat(web): add auth store, query client and msw test setup`

### Task 4: Router, guards, layouts และ component ที่ใช้ร่วมกัน

**Files:**
- Create:
  - `apps/web/src/router/{index.ts,routes.ts,guards.ts,guards.test.ts}`
  - `apps/web/src/features/auth/{redirect.ts,redirect.test.ts,setup.ts,setup.test.ts}`
  - `apps/web/src/layouts/{CustomerLayout,MerchantLayout,AuthLayout}.vue`
  - `apps/web/src/components/{AppLogo,BottomNav,TopNav,PriceTag,EmptyState,ErrorState,ImageWithFallback}.vue`, `ImageWithFallback.test.ts`
  - `apps/web/src/features/merchant/components/MerchantSidebar.vue`
  - `apps/web/src/pages/NotFoundPage.vue`
  - `apps/web/tests/mount-app.ts`
- Modify: `main.ts`, `App.vue`

**Interfaces:**
- Produces (`routes.ts`):
  - **ชื่อ route:** `home`, `shop`, `cart`, `orders`, `account`, `login`, `signup`, `merchant-queue`, `merchant-menu`, `merchant-menu-new`, `merchant-menu-edit`, `merchant-shop`, `merchant-shop-new`, `not-found`
  - **path:** ตามตารางข้อ 7 ของ spec (`/merchant` redirect ไป `merchant-queue`)
  - **หน้าที่ยังไม่สร้าง:** ใช้ placeholder component ชั่วคราวที่แสดงชื่อหน้า และ task ที่สร้างหน้านั้นจะมาแทน
  - **หน้า:** โหลดแบบ lazy ด้วย `() => import(...)`
- Produces (type ของ meta):

```ts
declare module 'vue-router' {
  interface RouteMeta {
    layout: 'customer' | 'merchant' | 'auth'
    requiresAuth?: boolean
    guestOnly?: boolean
    roles?: Role[]          // merchant routes: ['merchant', 'admin']
    requiresShop?: boolean  // ทุก /merchant/* ยกเว้น shop/new
    requiresNoShop?: boolean // /merchant/shop/new
  }
}
```

- Produces (`guards.ts`): `resolveGuard(to: RouteLocationNormalized, user: User | null): true | RouteLocationRaw` เป็น pure function ไล่เช็คตามลำดับนี้
  1. `guestOnly` และมี user: ไป `{ name: 'home' }`
  2. `requiresAuth` และไม่มี user: ไป `{ name: 'login', query: { redirect: to.fullPath } }`
  3. มี `roles` แต่ role ไม่อยู่ในรายการ: ไป `home`
  4. `requiresShop` และ `shopId === null`: ไป `merchant-shop-new`
  5. `requiresNoShop` และ `shopId !== null`: ไป `merchant-shop`
- Produces (`router/index.ts`): `createAppRouter(history?: RouterHistory): Router` ที่ใน `beforeEach` จะ `await auth.init()` ก่อนเรียก `resolveGuard`
- Produces (`features/auth/redirect.ts`):
  - `safeRedirect(value: unknown): string | null` รับเฉพาะ string ที่ขึ้นต้นด้วย `/` และไม่ขึ้นต้นด้วย `//` หรือ `/\`
  - `homeFor(user: User): RouteLocationRaw` ได้ `merchant-queue` เมื่อเป็น merchant หรือ admin ไม่อย่างนั้นได้ `home`
- Produces (`features/auth/setup.ts`): `setupApiAuth(router: Router): void` เรียก `configureApiClient({ getToken, onUnauthorized })`
  - `onUnauthorized` เรียก `useAuthStore().clearSession()` แล้ว `router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })`
  - ถ้าตอนนั้นอยู่หน้า `login` อยู่แล้วไม่ต้อง push
- Produces (`App.vue`): เลือก layout จาก `route.meta.layout` แล้วครอบ `<RouterView />` และมี `<Toaster richColors position="top-center" />`
- Produces (`main.ts`):
  - `z.config(z.locales.th())`
  - ติดตั้ง Pinia และ `VueQueryPlugin` (`{ queryClient }`) และ router
  - `setupApiAuth(router)`
  - `app.config.errorHandler` แสดง `toast.error(errorMessage(err))` และ `console.error`
- Produces (component ที่ใช้ร่วม, props และ emit):
  - `AppLogo()`
  - `PriceTag({ value: number })`
  - `EmptyState({ title: string; description?: string })` มี slot `action`
  - `ErrorState({ error: unknown })` emit `retry` และแสดง `errorMessage(error)` พร้อมปุ่ม "ลองใหม่"
  - `ImageWithFallback({ src: string | null; alt: string; ratio: '16/10' | '1/1' | '16/9' })` ใช้ `loading="lazy"`, `object-cover` และถ้า `src` เป็น null หรือโหลดไม่ได้ให้แสดงกล่อง `bg-primary/10` กับไอคอน `UtensilsCrossed`
  - `BottomNav({ cartCount: number })` และ `TopNav({ cartCount: number; user: User | null })` emit `logout`
  - `MerchantSidebar({ shopName: string | null; username: string })`
- **Layouts:**
  - `CustomerLayout`: `TopNav` แสดงเฉพาะ `md:` ขึ้นไป ส่วน `BottomNav` แสดงเฉพาะต่ำกว่า `md` และต้องเว้นที่ว่างด้านล่างเท่าความสูง nav ตัวเลขตะกร้าตอนนี้ส่ง `0` ไปก่อน (Task 8 จะเปลี่ยน)
  - `MerchantLayout`: ตั้งแต่ `lg:` ขึ้นไปใช้ sidebar ต่ำกว่านั้นเป็นแท็บแนวนอนด้านบน มีลิงก์ "ไปหน้าลูกค้า" (`home`) และใช้ชื่อร้านจาก `useShopQuery` ตั้งแต่ Task 7 (ตอนนี้ส่ง `null`)
- Produces (`tests/mount-app.ts`): `mountApp(options: { path: string; user?: User | null }): Promise<{ wrapper: VueWrapper; router: Router }>`
  - ใช้ memory history, Pinia ใหม่ และ `queryClient` singleton
  - ถ้ามี `user` ให้ตั้ง token และ handler `GET /api/auth/me` ให้คืน user นั้น
  - `await router.isReady()` และ `flushPromises()` ก่อนคืนค่า

- [ ] **Step 1: เขียน test ที่ต้อง fail**

```ts
// guards.test.ts: table test ครอบทุกกฎ
test.each([
  ['/cart', null, { name: 'login', query: { redirect: '/cart' } }],
  ['/login', customer, { name: 'home' }],
  ['/merchant/queue', customer, { name: 'home' }],
  ['/merchant/queue', merchantNoShop, { name: 'merchant-shop-new' }],
  ['/merchant/shop/new', merchantWithShop, { name: 'merchant-shop' }],
  ['/merchant/queue', adminWithShop, true],
  ['/shops/3', null, true],
])('%s as %o', (path, user, expected) => expect(resolveGuard(router.resolve(path), user)).toEqual(expected))

// redirect.test.ts (Review Focus ข้อ 2)
test.each(['//evil.com', 'https://evil.com', 'javascript:alert(1)', '/\\evil.com', 42, undefined])('rejects %s', (v) =>
  expect(safeRedirect(v)).toBeNull())
test('accepts internal paths', () => expect(safeRedirect('/shops/3?x=1')).toBe('/shops/3?x=1'))

// setup.test.ts (Review Focus ข้อ 1)
test('a 401 during use clears the session and sends the user to login with a redirect', async () => {
  const { router } = await mountApp({ path: '/cart', user: makeUser() })
  queryClient.setQueryData(queryKeys.cart, [makeCart()])
  server.use(http.get('*/api/cart', () => HttpResponse.json(unauthorizedBody, { status: 401 })))
  await queryClient.refetchQueries({ queryKey: queryKeys.cart }).catch(() => {})
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('login')
  expect(router.currentRoute.value.query.redirect).toBe('/cart')
  expect(getToken()).toBeNull(); expect(queryClient.getQueryData(queryKeys.cart)).toBeUndefined()
})

// ImageWithFallback.test.ts
test('shows the fallback when src is null', ...)
test('swaps to the fallback after an image error', ...)    // trigger('error') บน <img>
```

- [ ] **Step 2: รัน test ต้อง FAIL**
- [ ] **Step 3: Implement**
  - layout และ nav ทำตาม mockup แท็บ "แบบ D สีส้มพริก" (`M-Home` สำหรับ BottomNav และ header ส่วน `Merchant-Queue` สำหรับ sidebar)
  - BottomNav มี 4 ปุ่ม: หน้าแรก (`House`), ตะกร้า (`ShoppingCart` + badge), คิวของฉัน (`Ticket`), บัญชี (`User`)
  - ใช้ `RouterLink` ที่มี `active-class`
- [ ] **Step 4: รัน test ต้อง PASS แล้วรัน `pnpm lint`, `pnpm typecheck` และ `pnpm --filter @canteen/web build`**
- [ ] **Step 5: Commit** `feat(web): add router guards, layouts and shared components`

### Task 5: หน้า Login, Signup และ Account

**Files:**
- Create:
  - `apps/web/src/features/auth/pages/{LoginPage,SignupPage,AccountPage}.vue`
  - `apps/web/tests/auth-flow.test.ts`
- Modify: `routes.ts` (เอาหน้าจริงมาแทน placeholder)

**Interfaces:**
- Consumes: `useAuthStore`, `toFormSchema`, `applyServerErrors`, `safeRedirect`, `homeFor`, shadcn `Form` / `Input` / `RadioGroup` / `Button`
- **LoginPage:**
  - ฟอร์ม `loginSchema` ช่อง "ชื่อผู้ใช้" และ "รหัสผ่าน"
  - สำเร็จแล้วไป `safeRedirect(route.query.redirect) ?? homeFor(user)`
  - 401 แสดงข้อความรวม 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' (`errorMessage(err, { UNAUTHORIZED: ... })`)
  - มีลิงก์ไปหน้าสมัคร โดยส่ง `redirect` ต่อไปด้วย
- **SignupPage:**
  - ฟอร์ม `signupSchema` ทุกช่อง และใช้ RadioGroup เลือก role "ลูกค้า" (`customer`) หรือ "ร้านค้า" (`merchant`) ค่าเริ่มต้นเป็น `customer`
  - 409 แสดง 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' ใต้ช่อง `username`
  - สำเร็จแล้ว login อัตโนมัติ แล้วไปตาม `homeFor` (merchant ใหม่ไปต่อที่ `merchant-shop-new` ผ่าน guard)
- **AccountPage:**
  - แสดงชื่อ, username, email, mobile และ role เป็นภาษาไทย
  - merchant หรือ admin มีปุ่ม "จัดการร้านของฉัน" ไป `merchant-queue`
  - ปุ่ม "ออกจากระบบ" เรียก `auth.logout()` แล้วไป `home`
- ปุ่ม submit ต้อง disabled และแสดงสถานะกำลังส่งระหว่างรอ

- [ ] **Step 1: เขียน flow test ที่ต้อง fail (`auth-flow.test.ts`, ใช้ MSW)**

```ts
test('customer login returns to the redirect target', async () => {
  const { wrapper, router } = await mountApp({ path: '/login?redirect=/shops/1' })
  await fill(wrapper, { username: 'customer1', password: 'Password123' }); await submit(wrapper)
  expect(router.currentRoute.value.fullPath).toBe('/shops/1')
})
test('merchant login without redirect goes to the merchant queue', ...)
test('unsafe redirect falls back to home', ...)             // ?redirect=//evil.com → '/'
test('wrong password shows the Thai message', ...)          // 401 → 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
test('signup 409 shows the error under username', ...)
test('signup validates on the client in Thai before sending', ...)  // mobile ผิด → ข้อความไทย, ไม่มี request
test('logout from account returns home and hides account links', ...)
```

- [ ] **Step 2: รัน test ต้อง FAIL**
- [ ] **Step 3: Implement** (หน้า login และ signup ใช้ AuthLayout มีโลโก้ ฟอร์มกว้างไม่เกิน `max-w-sm`)
- [ ] **Step 4: รัน test ต้อง PASS แล้วรัน lint และ typecheck**
- [ ] **Step 5: Commit** `feat(web): add login, signup and account pages`

### Task 6: `ImageUploadField`

**Files:** Create `apps/web/src/components/{ImageUploadField.vue,ImageUploadField.test.ts}`

**Interfaces:**
- Produces:
  - props `{ modelValue: File | null; currentUrl?: string | null; label: string; error?: string; maxMb?: number }` (`maxMb` default `Number(import.meta.env.VITE_UPLOAD_MAX_MB ?? 5)`)
  - emit `update:modelValue` (`File | null`) และ `invalid` (`message: string`)
  - export `ACCEPTED_IMAGE_TYPES` (5 ชนิดตาม Global Constraints)
- **พฤติกรรม:**
  - แสดงรูปตัวอย่าง: ใช้ไฟล์ที่เลือก (`URL.createObjectURL`) ก่อน ถ้าไม่มีใช้ `currentUrl` ถ้าไม่มีทั้งคู่แสดงกล่องว่างพร้อมปุ่ม "เลือกรูป"
  - คืน URL ด้วย `revokeObjectURL` ทุกครั้งที่เปลี่ยนไฟล์และตอน unmount
  - ไฟล์ไม่ผ่านเงื่อนไขต้องไม่ emit `update:modelValue`
  - ข้อความผิดพลาด: ชนิดผิด 'รองรับเฉพาะไฟล์ JPEG, PNG, WebP, AVIF หรือ GIF' ขนาดเกิน 'ไฟล์ต้องมีขนาดไม่เกิน 5 MB' (ตัวเลขตาม `maxMb`)
  - `input[type=file]` มี `accept` ตาม `ACCEPTED_IMAGE_TYPES` และผูก `<label>` กับ input ไว้
  - แสดง `error` จาก prop ใต้ช่อง (ใช้รับ error ที่ server ตอบมาที่ path `image`)

- [ ] **Step 1: เขียน test ที่ต้อง fail (Review Focus ข้อ 4)**

```ts
test('emits the chosen file and previews it', ...)         // stub URL.createObjectURL
test('rejects an oversized file with a Thai message and keeps the old value', async () => {
  const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
  await choose(wrapper, big)
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  expect(wrapper.emitted('invalid')?.[0]).toEqual(['ไฟล์ต้องมีขนาดไม่เกิน 5 MB'])
})
test('rejects an unsupported type', ...)                    // image/svg+xml
test('shows currentUrl when no file is chosen', ...)
test('revokes the object URL on unmount', ...)
```

- [ ] **Step 2: รัน test ต้อง FAIL**
- [ ] **Step 3: Implement**
- [ ] **Step 4: รัน test ต้อง PASS แล้วรัน lint และ typecheck**
- [ ] **Step 5: Commit** `feat(web): add image upload field with client-side checks`

### Task 7: หน้าแรกและหน้าร้าน (ดูอย่างเดียว)

**Files:**
- Create:
  - `apps/web/src/features/shops/{api.ts,queries.ts,index.ts}`
  - `apps/web/src/features/shops/components/{ShopCard,MenuItemCard}.vue`, `MenuItemCard.test.ts`
  - `apps/web/src/features/shops/pages/{HomePage,ShopPage}.vue`
  - `apps/web/tests/shops-flow.test.ts`
- Modify: `routes.ts`, `MerchantLayout.vue` (ชื่อร้านจาก `useShopQuery(user.shopId)`)

**Interfaces:**
- Produces (`api.ts`):
  - `getShops(search: string): Promise<Shop[]>` (`z.array(shopSchema)` และส่ง `search` เฉพาะตอนที่ไม่ว่าง)
  - `getShop(id: number): Promise<ShopDetail>`
- Produces (`queries.ts`):
  - `useShopsQuery(search: MaybeRefOrGetter<string>)`
  - `useShopQuery(id: MaybeRefOrGetter<number | null>)` (ปิดการทำงานเมื่อ id เป็น `null`)
- Produces (component):
  - `ShopCard({ shop: Shop })` เป็น `RouterLink` ไป `shop` มี `ImageWithFallback` 16:10 ชื่อร้านและคำอธิบายแบบบรรทัดเดียว (truncate)
    - จอเล็กกว่า `md` ใช้แบบแถว (รูปซ้าย 76px) ส่วน `md:` ขึ้นไปเป็นการ์ดแนวตั้ง
  - `MenuItemCard({ product: Product; quantity: number; disabled?: boolean })` emit `change(quantity: number)`
    - ถ้า `status === 'not-available'` ให้แสดงป้าย 'หมดชั่วคราว' ทำให้จางลง และไม่มีปุ่ม
    - มี `QuantityStepper` ใน slot (Task 8 จะเติม) ตอนนี้ยังเป็นปุ่ม + เพิ่มทีละ 1
- **HomePage:**
  - ส่วนหัวมีช่องค้นหาที่ผูกกับ `?q=` ใน URL (debounce 300ms แล้ว `router.replace`)
  - banner 'สั่งก่อน รับก่อน' และหัวข้อ 'ร้านในโรงอาหาร' พร้อมจำนวนร้าน
  - grid หรือ list ของ `ShopCard`
  - ระหว่างโหลดแสดง Skeleton 4 ใบ error แสดง `ErrorState`
  - ผลว่างแสดง `EmptyState` 'ไม่พบร้านที่ค้นหา' หรือ 'ยังไม่มีร้านในโรงอาหาร'
- **ShopPage:**
  - ปกร้าน 16:9, ชื่อ, คำอธิบาย และหัวข้อ 'เมนู' ตามด้วยรายการ `MenuItemCard`
  - ร้านไม่มีเมนูแสดง `EmptyState` 'ร้านนี้ยังไม่มีเมนู'
  - API ตอบ 404 ให้ render `NotFoundPage` ในหน้านั้นเลย
  - id ที่ไม่ใช่ตัวเลขบวกให้แสดง Not Found โดยไม่ยิง request

- [ ] **Step 1: เขียน test ที่ต้อง fail**

```ts
// shops-flow.test.ts (Review Focus ข้อ 5)
test('home lists shops and links to each shop', ...)
test('typing in search updates ?q= and requests ?search=', async () => {
  vi.useFakeTimers(); ...; await input.setValue('ก๋วย'); vi.advanceTimersByTime(300); await flushPromises()
  expect(router.currentRoute.value.query.q).toBe('ก๋วย'); expect(lastSearchParam()).toBe('ก๋วย')
})
test('no results shows the empty state', ...)
test('shop page shows menu and marks not-available items', ...)
test('shop with no products shows "ร้านนี้ยังไม่มีเมนู"', ...)
test('/shops/9999 (API 404) shows Not Found', ...)
test('/shops/abc shows Not Found without calling the API', ...)

// MenuItemCard.test.ts
test('not-available product has no add button and shows หมดชั่วคราว', ...)
```

- [ ] **Step 2: รัน test ต้อง FAIL**
- [ ] **Step 3: Implement** ตาม mockup `M-Home` และ `M-Shop` (จอเล็ก) กับ `Delivery` (จอกว้าง) โดยตัดป้าย "x เมนู" ออก
- [ ] **Step 4: รัน test ต้อง PASS แล้วรัน lint และ typecheck**
- [ ] **Step 5: Commit** `feat(web): add home and shop pages`

### Task 8: ใส่ตะกร้าจากหน้าร้าน (`useShopCartDraft`)

**Files:**
- Create:
  - `apps/web/src/features/cart/{api.ts,queries.ts,index.ts}`
  - `apps/web/src/features/cart/composables/{useShopCartDraft.ts,useShopCartDraft.test.ts}`
  - `apps/web/src/features/shops/components/{QuantityStepper.vue,QuantityStepper.test.ts}`
- Modify: `ShopPage.vue`, `MenuItemCard.vue`, `CustomerLayout.vue` (badge)

**Interfaces:**
- Produces (`cart/api.ts`):
  - `getCarts(): Promise<Cart[]>`
  - `replaceCartItems(shopId: number, items: { productId: number; quantity: number }[]): Promise<Cart | null>` (ใช้ `cartSchema.nullable()` เพราะ 204 ได้ `null`)
  - `updateCartItem(id: number, quantity: number): Promise<CartItem>`
  - `removeCartItem(id: number): Promise<void>`
- Produces (`cart/queries.ts`):
  - `useCartsQuery()` ทำงานเฉพาะตอน `auth.isLoggedIn`
  - `useCartCount(): ComputedRef<number>` ได้ผลรวม `quantity` ของทุกตะกร้า
- Produces (`useShopCartDraft.ts`):
  - `DEBOUNCE_MS = 300`
  - `useShopCartDraft(shopId: MaybeRefOrGetter<number>, options?: { onError?: (error: unknown) => void }): { quantities: Readonly<Ref<Record<number, number>>>; setQuantity(productId: number, quantity: number): void; itemCount: ComputedRef<number> }`
  - `onError` default เป็น `toast.error(errorMessage(e))`
- **อัลกอริทึม (การตัดสินใจที่ test ต้องตรึงไว้):**
  1. `quantities` ตั้งต้นจาก cart ของร้านนั้นใน `['cart']` และ sync จาก server ทุกครั้งที่ข้อมูลเปลี่ยน ยกเว้นตอนที่ยังมีค่าที่ผู้ใช้แก้แต่ยังไม่ได้ส่ง หรือมี request ค้างอยู่
  2. `setQuantity` บีบค่าไว้ในช่วง 0–99 (0 คือเอาออก) แก้ `quantities` ทันที แล้วตั้ง timer `DEBOUNCE_MS` ใหม่
  3. ครบเวลาแล้วถ้ามี request ค้างอยู่ ให้ทำเครื่องหมายว่ายังมีค่าค้างและรอ ไม่อย่างนั้นส่ง `replaceCartItems` ด้วย **ค่าล่าสุดทั้งหมด** (เรียงตาม productId)
  4. request เสร็จแล้วถ้ายังมีค่าค้าง ส่งรอบใหม่ทันที ถ้าไม่มีให้ `invalidateQueries(['cart'])`
  5. ถ้า error ให้ล้างค่าค้าง invalidate `['cart']` คืน `quantities` ตามข้อมูล server และเรียก `onError`
- Produces (`QuantityStepper`):
  - props `{ modelValue: number; min?: number; max?: number; label: string }` emit `update:modelValue`
  - ปุ่ม − และ + กว้าง 44px มี `aria-label` 'ลดจำนวน {label}' และ 'เพิ่มจำนวน {label}'
  - ถ้า `modelValue === 0` แสดงแค่ปุ่ม + ปุ่มเดียว
- **ShopPage:**
  - ใช้ `useShopCartDraft(shop.id)`
  - ถ้ายังไม่ login แล้วกด + ให้ไป `login` พร้อม `redirect` เป็นหน้านี้ โดยไม่แก้ตะกร้า
  - ถ้ามีของในตะกร้า แสดงแถบลอยด้านล่าง 'ดูตะกร้า' พร้อมจำนวนและราคารวมของร้าน (คำนวณจาก `quantities × product.price`) กดแล้วไป `cart`
- **CustomerLayout:** badge ใช้ `useCartCount()`

- [ ] **Step 1: เขียน test ที่ต้อง fail (`useShopCartDraft.test.ts`, fake timers + MSW)**

```ts
test('three quick taps send one PUT with the final quantity', async () => {
  draft.setQuantity(1, 1); draft.setQuantity(1, 2); draft.setQuantity(1, 3)
  await vi.advanceTimersByTimeAsync(300)
  expect(puts).toHaveLength(1); expect(puts[0]).toEqual({ items: [{ productId: 1, quantity: 3 }] })
})
test('a change during an in-flight PUT is sent after it finishes, never in parallel', async () => {
  // PUT แรกค้างไว้ด้วย deferred → setQuantity(1, 5) → advance 300 → ยังมี 1 request
  // resolve แรก → flush → request ที่ 2 มี quantity 5; ไม่มีช่วงไหนที่ inFlight > 1
})
test('quantity 0 removes the product from the payload', ...)
test('on error, quantities revert to the server cart and onError is called', ...)
test('server data does not overwrite unsent local edits', ...)

// QuantityStepper.test.ts
test('clamps at max 99 and min', ...)
test('shows only + at zero', ...)

// เพิ่มใน shops-flow.test.ts
test('guest tapping + is sent to login with redirect back to the shop', ...)
test('floating bar shows count and total after adding', ...)
```

- [ ] **Step 2: รัน test ต้อง FAIL**
- [ ] **Step 3: Implement**
- [ ] **Step 4: รัน test ต้อง PASS แล้วรัน lint และ typecheck**
- [ ] **Step 5: Commit** `feat(web): add debounced cart editing on the shop page`

### Task 9: ตะกร้า, สั่งอาหาร และคิวของฉัน

**Files:**
- Create:
  - `apps/web/src/features/cart/components/CartGroup.vue`, `apps/web/src/features/cart/pages/CartPage.vue`
  - `apps/web/src/features/orders/{api.ts,queries.ts,index.ts}`
  - `apps/web/src/features/orders/components/{QueueTicket.vue,QueueTicket.test.ts}`
  - `apps/web/src/features/orders/pages/MyOrdersPage.vue`
  - `apps/web/tests/order-flow.test.ts`
- Modify: `cart/queries.ts`, `routes.ts`

**Interfaces:**
- Produces (`orders/api.ts`): `getMyOrders(): Promise<OrderList>`, `checkout(cartId: number): Promise<Order>`
- Produces (`orders/queries.ts`):
  - `QUEUE_REFETCH_MS = 15_000`
  - `useMyOrdersQuery()` ตั้ง `refetchInterval: QUEUE_REFETCH_MS` และ `refetchOnWindowFocus: true`
  - `useCheckoutMutation()` สำเร็จแล้ว invalidate `['cart']` และ `['orders','mine']`
- Produces (`cart/queries.ts`):
  - `useUpdateCartItemMutation()` และ `useRemoveCartItemMutation()` invalidate `['cart']`
  - error แสดง toast ด้วย `errorMessage`
- Produces (component):
  - `CartGroup({ cart: Cart; busy: boolean })` emit `changeQuantity(itemId: number, quantity: number)`, `remove(itemId: number)` และ `checkout(cartId: number)`
    - ปุ่ม − ตอนจำนวนเป็น 1 จะ emit `remove`
    - ปุ่ม 'สั่งอาหารร้านนี้' แสดงราคารวม
    - ลิงก์ 'เพิ่มเมนู' ไป `shop`
  - `QueueTicket({ order: Order })`
    - เลข `#${order.id}` ตัวใหญ่สี primary, ชื่อร้าน, 'สั่งเมื่อ HH:mm'
    - เส้นปรุ, แถบความคืบหน้า 'เสร็จแล้ว x จาก y รายการ' และรายการพร้อมเครื่องหมายเสร็จ (`text-success`) หรือ 'รอ'
    - ราคารวม และป้ายสถานะ: 'กำลังทำ' (accent) เมื่อ `waiting` หรือ 'เสร็จแล้ว' (success) เมื่อ `finished` และถ้า finished แสดง 'เสร็จ HH:mm' จาก `finishedAt`
- **CartPage:**
  - หัวข้อ 'ตะกร้า' และข้อความ '{n} ร้าน · แยกสั่งทีละร้าน' ตามด้วย `CartGroup` ทีละตะกร้า
  - ตะกร้าว่างแสดง `EmptyState` 'ตะกร้ายังว่าง' พร้อมปุ่ม 'ไปเลือกร้าน'
  - สั่งสำเร็จแล้วแสดง toast 'สั่งอาหารแล้ว' และไป `orders`
- **MyOrdersPage:**
  - หัวข้อ 'คิวของฉัน' และ Tabs 'กำลังทำ ({waiting.length})' กับ 'เสร็จแล้ว ({finished.length})'
  - แต่ละแท็บแสดง `QueueTicket` แท็บที่ว่างแสดง `EmptyState` 'ยังไม่มีคิว'

- [ ] **Step 1: เขียน test ที่ต้อง fail**

```ts
// order-flow.test.ts
test('checkout from the cart goes to the queue and shows the new ticket', async () => {
  // GET cart → [cart A]; POST /orders → order #42; GET orders/mine → waiting [#42]
  await click(wrapper, 'สั่งอาหารร้านนี้')
  expect(router.currentRoute.value.name).toBe('orders'); expect(wrapper.text()).toContain('#42')
})
test('minus at quantity 1 removes the item', ...)          // DELETE /cart/items/:id
test('empty cart shows the empty state', ...)
test('no orders shows "ยังไม่มีคิว"', ...)
test('my orders refetches every 15 seconds', ...)           // fake timers: GET orders/mine 2 ครั้งหลัง 15_000ms

// QueueTicket.test.ts
test('shows number, progress and per-item state', ...)     // 1 of 2 done → 'เสร็จแล้ว 1 จาก 2 รายการ'
test('finished order shows เสร็จแล้ว and finish time', ...)
```

- [ ] **Step 2: รัน test ต้อง FAIL**
- [ ] **Step 3: Implement** ตาม mockup `M-Cart` และ `M-Queue`
- [ ] **Step 4: รัน test ต้อง PASS แล้วรัน lint และ typecheck**
- [ ] **Step 5: Commit** `feat(web): add cart checkout and customer queue`

### Task 10: แม่ค้า: จัดการคิว

**Files:**
- Create:
  - `apps/web/src/features/merchant/{api.ts,queries.ts,index.ts}`
  - `apps/web/src/features/merchant/components/{OrderCard.vue,OrderCard.test.ts}`
  - `apps/web/src/features/merchant/pages/QueuePage.vue`
  - `apps/web/tests/merchant-queue.test.ts`
- Modify: `routes.ts`

**Interfaces:**
- Produces (`merchant/api.ts`):
  - `getShopOrders(): Promise<ShopOrderList>`
  - `setOrderStatus(id: number, status: OrderStatus): Promise<ShopOrder>`
  - `setOrderItemDone(id: number, isDone: boolean): Promise<OrderItem>`
- Produces (`merchant/queries.ts`):
  - `useShopOrdersQuery()` ตั้ง `refetchInterval: QUEUE_REFETCH_MS` (import จาก `features/orders`) และ `refetchOnWindowFocus: true`
  - `useToggleOrderItemMutation()` ทำแบบ optimistic:
    - `onMutate`: `cancelQueries(['orders','shop'])` เก็บ snapshot แล้วตั้ง `isDone` ของ item นั้นใน cache
    - `onError`: คืน snapshot และแสดง toast
    - `onSettled`: invalidate
  - `useSetOrderStatusMutation()` invalidate `['orders','shop']`
- Produces (`OrderCard`):
  - props `{ order: ShopOrder; variant: 'waiting' | 'finished'; busy?: boolean }`
  - emit `toggleItem(itemId: number, isDone: boolean)`, `complete(orderId: number)` และ `reopen(orderId: number)`
  - **waiting:** เลขคิว, '{firstName} · {mobile}', เวลาสั่ง, เส้นปรุ, Checkbox ต่อรายการ (label คือชื่อและจำนวน), ราคารวม และปุ่ม 'เสร็จทั้งออเดอร์'
  - **finished:** แบบย่อ มีเลขคิว, รายการ, 'เสร็จ HH:mm · ราคา' และปุ่ม 'ย้อนกลับ'
- **QueuePage:**
  - หัวข้อ 'คิวออเดอร์' และคำอธิบาย 'คิวเก่าอยู่ก่อน ติ๊กทีละรายการเมื่อทำเสร็จ' พร้อมป้ายจำนวน 'รอทำ n' และ 'เสร็จแล้ว n'
  - grid ของการ์ด waiting (เรียงตามที่ API ส่งมา) และคอลัมน์ 'เสร็จแล้ว'
  - ไม่มีคิวแสดง `EmptyState` 'ยังไม่มีออเดอร์'

- [ ] **Step 1: เขียน test ที่ต้อง fail**

```ts
// merchant-queue.test.ts
test('ticking an item updates immediately and calls PATCH /order-items/:id', ...)
test('a poll landing mid-toggle does not revert the tick (Review Focus 3)', async () => {
  // PATCH ค้างไว้ (deferred); ระหว่างนั้น advance 15_000 ให้ poll ทำงานและคืนข้อมูลเก่า isDone:false
  // ตรวจว่า checkbox ยัง checked; resolve PATCH → GET ใหม่คืน isDone:true → ยัง checked
})
test('a failed toggle rolls back and shows a toast', ...)
test('complete moves the order to the finished column', ...) // PATCH status finished → refetch
test('reopen sends status waiting', ...)
test('no orders shows the empty state', ...)

// OrderCard.test.ts
test('emits toggleItem with the new value', ...)
test('finished variant shows reopen instead of checkboxes', ...)
```

- [ ] **Step 2: รัน test ต้อง FAIL**
- [ ] **Step 3: Implement** ตาม mockup `Merchant-Queue` (ส่วนจอแคบกว่า `lg` ให้คอลัมน์ 'เสร็จแล้ว' ลงไปอยู่ใต้ grid)
- [ ] **Step 4: รัน test ต้อง PASS แล้วรัน lint และ typecheck**
- [ ] **Step 5: Commit** `feat(web): add merchant queue management`

### Task 11: แม่ค้า: ร้านและเมนู

**Files:**
- Create:
  - `apps/web/src/features/merchant/components/{ShopForm,ProductForm}.vue`
  - `apps/web/src/features/merchant/pages/{ShopCreatePage,ShopEditPage,MenuPage,ProductEditPage}.vue`
  - `apps/web/tests/merchant-shop.test.ts`
- Modify: `merchant/api.ts`, `merchant/queries.ts`, `routes.ts`

**Interfaces:**
- Produces (`merchant/api.ts`):
  - `createShop(form: FormData): Promise<Shop>`, `updateShop(id: number, form: FormData): Promise<Shop>`
  - `createProduct(shopId: number, form: FormData): Promise<Product>`, `updateProduct(id: number, form: FormData): Promise<Product>`
  - `setProductStatus(id: number, status: ProductStatus): Promise<Product>`
- Produces (`merchant/queries.ts`):
  - `useCreateShopMutation()`: สำเร็จแล้ว invalidate `['shops']` และเรียก `auth.refreshMe()`
  - `useUpdateShopMutation()`: invalidate `['shops']`
  - `useSaveProductMutation()`: invalidate `['shops','detail',shopId]`
  - `useSetProductStatusMutation()`: optimistic บน `['shops','detail',shopId]` (เหมือนรูปแบบใน Task 10)
- Produces (component):
  - `ShopForm({ initial?: { name: string; description: string; imageUrl: string | null }; imageRequired: boolean; submitting: boolean; serverError?: unknown })` emit `submit({ fields: ShopFields; image: File | null })`
  - `ProductForm` แบบเดียวกัน แต่ `fields` เป็น `ProductFields` และช่องราคาเป็น number input (`step="0.01"`, `min="0.01"`)
  - **ตรวจฟอร์ม:** ใช้ `toFormSchema(shopFieldsSchema | productFieldsSchema)` ถ้า `imageRequired` แต่ยังไม่มีไฟล์ แสดง 'กรุณาเลือกรูป' ใต้ช่องรูปโดยไม่ submit
  - **error จาก server:** `serverError` ส่งผ่าน `applyServerErrors` ไปยังช่อง `['name','description','price','image']` (path `image` แสดงที่ `ImageUploadField`)
- **ShopCreatePage:** หัวข้อ 'สร้างร้านของคุณ' ใช้ `imageRequired: true` สำเร็จแล้วแสดง toast 'สร้างร้านแล้ว' และไป `merchant-queue`
- **ShopEditPage:** โหลดจาก `useShopQuery(user.shopId)` สำเร็จแล้วแสดง toast 'บันทึกแล้ว'
- **MenuPage:**
  - รายการเมนูทุกสถานะ แต่ละแถวมีรูป, ชื่อ, ราคา, Switch 'เปิดขาย' และลิงก์ 'แก้ไข'
  - มีปุ่ม 'เพิ่มเมนู'
  - ไม่มีเมนูแสดง `EmptyState` 'ยังไม่มีเมนู' พร้อมปุ่มเพิ่ม
- **ProductEditPage:**
  - ใช้กับทั้ง `merchant-menu-new` (`imageRequired: true`) และ `merchant-menu-edit`
  - edit หาเมนูจาก shop detail ถ้าไม่เจอแสดง Not Found
  - สำเร็จแล้วกลับไป `merchant-menu`
  - API ตั้งเมนูใหม่เป็น `not-available` จึงแสดง toast 'เพิ่มเมนูแล้ว เปิดขายได้ที่หน้าเมนู'

- [ ] **Step 1: เขียน test ที่ต้อง fail**

```ts
// merchant-shop.test.ts
test('merchant without a shop is sent to create shop, and lands on the queue after creating', async () => {
  // user shopId null → /merchant/queue redirects to /merchant/shop/new
  // submit (POST multipart: name, description, image) → /auth/me คืน shopId 7 → route merchant-queue
})
test('create shop without an image shows กรุณาเลือกรูป and sends nothing', ...)
test('server 400 on image is shown under the image field (Review Focus 4)', ...)
test('edit shop pre-fills fields and sends PUT without image when unchanged', ...)
test('menu switch toggles status optimistically', ...)
test('new product posts to /shops/:shopId/products and returns to the menu', ...)
test('editing an unknown product id shows Not Found', ...)
```

- [ ] **Step 2: รัน test ต้อง FAIL**
- [ ] **Step 3: Implement** (ใช้ `toFormData` จาก Task 2 ตอน edit ถ้าไม่ได้เลือกรูปใหม่ก็ไม่ต้องส่ง `image`)
- [ ] **Step 4: รัน test ต้อง PASS แล้วรัน lint, typecheck และ build**
- [ ] **Step 5: Commit** `feat(web): add merchant shop and menu management`

### Task 12: Docker, CI และเอกสาร

**Files:**
- Create: `apps/web/Dockerfile`, `apps/web/nginx.conf`
- Modify: `docker-compose.yml`, `.github/workflows/ci.yml`, `README.md` (ส่วน Development), `docs/superpowers/phase1-followups.md`

**Interfaces:**
- **Dockerfile:**
  - build context เป็น root ของ repo (แบบเดียวกับ `apps/api/Dockerfile`)
  - stage build ใช้ `node:24-slim` และ `corepack enable` แล้ว copy manifest ของ root, `apps/web` และ `packages/shared`
  - `pnpm install --frozen-lockfile --filter "@canteen/web..."` (ใช้ cache mount แบบเดียวกับ api) แล้ว copy source และ `pnpm --filter @canteen/web build`
  - stage runtime ใช้ `nginx:<stable>-alpine` (pin tag ที่มีอยู่จริงหลังรัน `docker pull` ผ่าน) copy `dist` ไป `/usr/share/nginx/html` และ `nginx.conf` ไป `/etc/nginx/conf.d/default.conf`
- **nginx.conf:**
  - `listen 80`, `client_max_body_size 6m`
  - `location /api/` และ `location /uploads/` ส่ง `proxy_pass http://api:3000` พร้อม `proxy_set_header Host` และ `X-Forwarded-For`
  - `location /assets/` ตั้ง `Cache-Control: public, max-age=31536000, immutable`
  - `location /` ใช้ `try_files $uri $uri/ /index.html` และ `index.html` ตั้ง `Cache-Control: no-cache`
  - **Security headers** ต้องมีในทุก response รวมถึง `/assets/` เพราะ `add_header` ใน location จะทำให้ header ของ server block ไม่ถูกส่งต่อ จึงต้องใช้ `include` ไฟล์ snippet หรือประกาศซ้ำ
    - `Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy: strict-origin-when-cross-origin`
- **compose:** เพิ่ม service `web` ที่ build จาก `apps/web/Dockerfile` และ `depends_on: api: condition: service_healthy` พร้อม `ports: '8080:80'`
- **CI:** เพิ่ม `- run: pnpm build` ต่อจาก `pnpm test`
- **README:**
  - `pnpm dev` (api :3000 และ web :5173)
  - `docker compose up --build` แล้วเปิด `http://localhost:8080`
  - บัญชี demo
- **phase1-followups.md:** ทำเครื่องหมายว่าเรื่อง CORP (แก้ด้วย proxy) และ ECONNRESET (แก้ด้วย `NETWORK_ERROR`) จบแล้ว

- [ ] **Step 1: เขียนไฟล์ตาม Interfaces**
- [ ] **Step 2: ตรวจ:**
  - `docker compose up -d --build web` แล้ว `curl -sI http://localhost:8080/` ต้องได้ 200 และมี CSP header
  - `curl -s http://localhost:8080/api/shops` ต้องได้ JSON ร้าน
  - `curl -sI http://localhost:8080/shops/1` ต้องได้ 200 (SPA fallback)
  - `curl -sI http://localhost:8080/uploads/<ชื่อไฟล์จาก imageUrl ของร้าน>` ต้องได้ 200
  - `curl -sI http://localhost:8080/assets/<ไฟล์ js>` ต้องมีทั้ง CSP และ `immutable`
- [ ] **Step 3: รัน `pnpm build` ที่ root ต้องผ่าน**
- [ ] **Step 4: Commit** `build(web): add nginx image, compose service and ci build`

### Task 13: รูปอาหารจริงใน seed (ต้องให้เจ้าของ repo เลือก)

> Task นี้มีขั้นตอนที่ต้องรอเจ้าของ repo **controller ทำเอง ห้ามส่งให้ subagent**

**Files:**
- Modify: `apps/api/seed/images/*` (shop-1..5, product-1..5) และนามสกุลของรูปใน `apps/api/src/db/seed-data.ts`
- Create: `apps/api/seed/images/CREDITS.md`

- [ ] **Step 1: หาตัวเลือก:**
  - หารูปจาก Unsplash หรือ Pexels (license อนุญาตให้ใช้ฟรีรวมถึงเชิงพาณิชย์) ช่องละ 2–3 รูป
  - shop-1 ร้านก๋วยเตี๋ยว, shop-2 อาหารตามสั่ง, shop-3 เครื่องดื่ม, shop-4 ข้าวผัด, shop-5 ลูกชิ้นทอด
  - product-1 ก๋วยเตี๋ยวต้มยำ, product-2 ก๋วยเตี๋ยวน้ำตก, product-3 ก๋วยเตี๋ยวแห้ง, product-4 ผัดกะเพรา, product-5 ข้าวผัด
  - แสดงให้เจ้าของ repo ดูเป็นหน้าเดียว (ใช้ canvas เดิมหรือ artifact หน้าใหม่) พร้อมลิงก์ต้นฉบับ
- [ ] **Step 2: หยุดรอเจ้าของ repo เลือก**
- [ ] **Step 3: ดาวน์โหลดรูปที่เลือก:**
  - ย่อให้ด้านยาวไม่เกิน 1200px และขนาดไฟล์ไม่เกิน 300 KB (ใช้ JPEG หรือ WebP)
  - ตั้งชื่อตาม pattern เดิม และแก้นามสกุลใน `seed-data.ts`
  - ลบไฟล์เก่าที่นามสกุลไม่ตรงแล้วออก
- [ ] **Step 4: เขียน `CREDITS.md`** แบบตาราง: ไฟล์, ช่างภาพ, ลิงก์ต้นฉบับ, license
- [ ] **Step 5: ตรวจ:**
  - `pnpm --filter @canteen/api test` ต้องผ่าน
  - `pnpm db:reset` แล้ว `GET /api/shops` ต้องได้ `imageUrl` ที่โหลดรูปใหม่ได้
- [ ] **Step 6: Commit** `chore(seed): replace clipart with licensed food photos`

### Task 14: ตรวจรับบนระบบจริง และลบ `myfrontend/`

**Files:**
- Delete: `myfrontend/`
- Modify: `eslint.config.js` (เอา `myfrontend/**` ออกจาก ignores), `.dockerignore` (เอา `myfrontend` ออก), `README.md`

- [ ] **Step 1: เปิดระบบ:** `docker compose up -d --build` แล้วไล่ทุกแถวในข้อ 14 ของ spec ที่ `http://localhost:8080`
  - ใช้ `customer1` สั่งจาก 2 ร้าน
  - ใช้ `merchant2` ติ๊กรายการและกดเสร็จ
  - ใช้ `merchant1` แก้ร้าน เพิ่มเมนูพร้อมรูป และเปิดขาย
  - สมัคร merchant ใหม่แล้วสร้างร้าน
  - ทำซ้ำบางส่วนที่ `pnpm dev` (`:5173`) เพื่อยืนยันว่ารูปจาก `/uploads` แสดงผ่าน Vite proxy ได้
  - ถ่ายภาพหน้าจอเก็บไว้ใน scratchpad ใช้ประกอบรายงาน
- [ ] **Step 2: เช็ค responsive:**
  - ฝั่งลูกค้าที่ความกว้าง 375px และฝั่งแม่ค้าที่ 1024px ต้องไม่มี scroll แนวนอน
  - สลับ BottomNav กับ TopNav ที่ 768px และแสดง sidebar ที่ 1024px ได้ถูก
- [ ] **Step 3: ถ้าเจอบั๊ก:** แก้ใน task ที่เกี่ยวข้องด้วย test ก่อน (ใช้ superpowers:systematic-debugging) แล้วค่อยไปต่อ
- [ ] **Step 4: เก็บกวาด:** ลบ `myfrontend/`, แก้ ignores และอัปเดต README
- [ ] **Step 5: ตรวจ:**
  - `pnpm lint`, `pnpm typecheck`, `pnpm test` และ `pnpm build` ที่ root ต้องผ่านทั้งหมด
  - `git diff --stat ce44bbd -- apps/api/src` (commit ตอนจบเฟส 1) ต้องแสดงแค่ `apps/api/src/db/seed-data.ts`
- [ ] **Step 6: Commit** `chore: remove legacy vue 2 frontend`
- [ ] **Step 7: หยุดและรายงานเจ้าของ repo** การ merge เข้า `master` และติด tag `v1-legacy` ต้องได้รับอนุญาตก่อน (เกณฑ์ข้อ 7 ของ spec)
