# Phase 1: งานที่เลื่อนไว้ (follow-ups)

รายการนี้รวบรวมจากการรีวิวทีละ task และการรีวิวรอบสุดท้ายของเฟส 1 ผู้รีวิวรอบสุดท้ายประเมินแล้วว่า**ไม่มีข้อไหนต้องแก้ก่อน merge**

## ต้องตัดสินใจตอนเริ่มเฟส 2
- [x] **เสร็จแล้ว (เฟส 2: Vite proxy ตอน dev และ nginx proxy ตอน Docker ทำให้ same-origin):** **รูปจาก `/uploads` ข้าม origin:** helmet ตั้ง `Cross-Origin-Resource-Policy: same-origin` ทำให้ `<img>` บน `localhost:5173` โหลดรูปจาก `localhost:3000` ไม่ได้ แก้ได้สองทาง คือให้ Vite proxy path `/uploads` หรือตั้ง CORP เป็น `cross-origin` เฉพาะ route นี้
- [x] **เสร็จแล้ว (เฟส 2: api-client ของเว็บจัดเป็น `NETWORK_ERROR`):** **ECONNRESET:** ถ้า server ปฏิเสธ multipart request ก่อนอ่าน body จบ (เช่น token หมดอายุระหว่างอัปโหลด) client อาจได้ error ECONNRESET แทน 401 ฝั่ง frontend ควรจัดการกรณีนี้ให้เหมาะ

## ต้องทำตอน deploy (เฟส 4)
- ตั้ง `trust proxy` ให้ rate limiter ของ login เมื่ออยู่หลัง reverse proxy
- ตรวจ timezone ของ MySQL session ต้องเป็น UTC เพราะ Drizzle ถือว่าเป็น UTC
- บัญชี demo ใช้รหัสผ่านที่รู้กันทั่วไป (`Password123`) ต้องตัดสินใจว่าจะทำอย่างไรกับบัญชีเหล่านี้บน live demo

## คุณภาพโค้ด (ทำเมื่อสะดวก)
- รวม helper ที่ซ้ำกัน ได้แก่ `currentUser` (มีใน 4 controller) และ `BCRYPT_COST` (seed, auth, factories) ให้เหลือที่เดียว
- `upload.ts`: แก้ comment ที่บอกว่า MIME type "verified" เพราะจริงๆ คือค่าที่ client ประกาศมาเอง
- circular import ระหว่าง `products.service` กับ `shops.service`: ตอนนี้ปลอดภัย แต่ควรแยก logic ที่ประกอบข้อมูล shop detail ออกมา
- ทำให้เป็น transaction ทั้งหมด: `updateCartItem`, `setOrderItemDone`, signup (insert แล้ว read), login (สร้าง token แล้ว read)
- deadlock retry ยังไม่มี backoff, `withTransaction` ซ้อนกันไม่ได้ (เรียกซ้อนจะเปิด connection ใหม่ ไม่ใช่ savepoint)
- error จาก body-parser ที่เป็น 4xx ทุกตัวถูกแปลงเป็น `VALIDATION_ERROR`
- password ยังไม่จำกัดความยาวสูงสุดที่ 72 bytes (bcrypt จะตัดส่วนที่เกินทิ้งเอง), ช่อง search ยังไม่จำกัดความยาว
- ตอน PUT จะเขียนไฟล์ลง disk ก่อนแล้วค่อยเช็คสิทธิ์ (ไฟล์ถูกลบภายหลัง), รูปเก่าไม่ถูกลบเมื่ออัปโหลดรูปใหม่แทน, ราคาที่มีทศนิยมเกิน 2 ตำแหน่งถูกปัดเศษโดยไม่แจ้ง
- ตอน shutdown ยังไม่มี guard กันการเรียกซ้ำและไม่มี timer บังคับปิด, `fallbackLogger` ตั้งค่าซ้ำกับ logger หลัก
- `.gitattributes` (`eol=lf`), `tseslint.config` ที่อาจ deprecated, type ของ `vitest/globals` ที่มองเห็นได้จากโค้ดใน `src`

## Test ที่ควรเพิ่ม
- `docs.test` ตรวจแค่ชื่อ path ควรเช็ค method, multipart และ response 204 ด้วย
- test ของ CHECK constraint ควรเช็คว่าเป็น error `ER_CONSTRAINT_CHECK_VIOLATION` โดยเฉพาะ ไม่ใช่ error อะไรก็ได้
- ยังไม่มี test ของ ON UPDATE, RESTRICT และ UNIQUE ที่เหลือ
- ยังไม่มี test กรณีชื่อไฟล์ที่จงใจโจมตี (เช่น `../x.png`) และกรณีไฟล์ของ request ที่แพ้การแข่งกันสร้างร้านถูกลบทิ้ง
- ยังไม่มี test ว่าปิดบัง header ใน log จริง และ guard `_test` ยังไม่มี test อัตโนมัติ
- `setupFiles` ทำให้ unit test ที่ไม่ใช้ DB ต้องต่อ DB ด้วย
