# CanteenFoodOrdering Web Application Project
## Web Programming Course Project in academic 2nd Year
develope by using Vue.js Express.js and bulmaCSS with MySQL database  

## Project setup
```bash
npm install 
```

## Project start
```bash
npm run serve
```
## 📖 Overview

<table cellpadding="10" cellspacing="10">
  <tr>
    <td align="center" style="padding: 15px;">
      <img src="https://github.com/user-attachments/assets/2b16029f-3e9e-411f-abad-b4d4272068df" width="400" style="margin-bottom:10px;"/><br>
       หน้าร้านค้า
    </td>
    <td align="center" style="padding: 15px;">
      <img src="https://github.com/user-attachments/assets/37b53db0-67de-4a0f-ae8b-9b54572333fe" width="400" style="margin-bottom:10px;"/><br>
       หน้าตะกร้าสินค้า
    </td>
  </tr>
  <tr>
    <td align="center" style="padding: 15px;">
      <img src="https://github.com/user-attachments/assets/017ba30a-5030-4958-ba27-e4bb983c733c" width="400" style="margin-bottom:10px;"/><br>
       หน้ารายการที่สั่ง
    </td>
    <td align="center" style="padding: 15px;">
      <img src="https://github.com/user-attachments/assets/0488c9b4-8c83-4cd7-9d0c-baae2c838146" width="400" style="margin-bottom:10px;"/><br>
       หน้าแสดงร้านค้าในโรงอาหาร
    </td>
  </tr>
  <tr>
    <td align="center" style="padding: 15px;">
      <img src="https://github.com/user-attachments/assets/25fcc586-7fee-4af0-a484-6a9bac95d018" width="400" style="margin-bottom:10px;"/><br>
      หน้า Queue
    </td>
    <td align="center" style="padding: 15px;">
      <img src="https://github.com/user-attachments/assets/c530ab9a-0b05-46ae-92d6-dd4e39573a21" width="400" style="margin-bottom:10px;"/><br>
       หน้าจัดการร้าน
    </td>
  </tr>
</table>

## Development (v2 – in progress)

Rebuild เป็น pnpm monorepo: `apps/api` (Express 5 + TypeScript + Drizzle + MySQL), `apps/web` (Vue 3 + Vite) และ `packages/shared` (Zod schema ที่ใช้ร่วมกัน) — requires **Node ≥ 24**.

### Option 1: Docker (ง่ายที่สุด)

```bash
docker compose up --build
```

- เว็บ: http://localhost:8080 (nginx ให้บริการไฟล์ static และ proxy `/api`, `/uploads` ไปที่ API)
- API: http://localhost:3000
- API docs: http://localhost:3000/api/docs

### Option 2: Dev flow

```bash
corepack enable
pnpm install
docker compose up -d db
cp apps/api/.env.example apps/api/.env
pnpm db:reset
pnpm dev
```

`pnpm dev` เปิด API ที่ http://localhost:3000 และเว็บ (Vite) ที่ http://localhost:5173

```bash
pnpm test        # ต้องมี db ที่รันอยู่ (canteen_test)
pnpm lint
pnpm typecheck
pnpm build
```

### Demo accounts

`merchant1` – `merchant5` และ `customer1` — password: `Password123`

### Notes

- `docker/mysql/init.sql` (สร้างฐานข้อมูล `canteen_test`) รันเฉพาะตอน volume `db-data` ใหม่ — ถ้าต้องสร้างใหม่ใช้ `docker compose down -v`
- ควร reset volume `db-data` และ `uploads` พร้อมกัน เพราะ seed จะคัดลอกรูปภาพเฉพาะตอนที่ seed ข้อมูลเท่านั้น
