import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { _pool?: mysql.Pool };

const pool =
  globalForDb._pool ??
  mysql.createPool({
    uri: process.env.DATABASE_URL,
    connectionLimit: 10,
    // MariaDB/XAMPP: root ไม่มีรหัสผ่าน
    dateStrings: true,
  });

// บังคับ session ต่อ UTC จริงๆ (ไม่ใช่แค่ตั้ง config ฝั่ง client) — drizzle-orm mysql-core's timestamp()
// ตีความค่าที่ได้กลับมาว่าเป็น UTC เสมอ (mapFromDriverValue ต่อท้าย "+0000" ให้อัตโนมัติ ไม่มีทาง
// config เปลี่ยนพฤติกรรมนี้ต่อคอลัมน์) ถ้า session ของ MySQL ใช้ timezone อื่น (ที่นี่คือ
// SYSTEM = Asia/Bangkok +7) ค่าที่อ่านกลับมาจะถูกเลื่อนผิดไป 7 ชม. ทุกครั้ง (พบจากบั๊ก
// login-rate-limit ที่ขึ้น "รอ 417 นาที") — ตัวเลือก `timezone` ของ mysql2 ไม่ได้สั่ง SQL จริง
// ต้องยิง SET time_zone เองตอนเปิด connection ใหม่ทุกครั้ง
if (!globalForDb._pool) {
  pool.on("connection", (connection) => {
    connection.query("SET time_zone = '+00:00'");
  });
}

if (process.env.NODE_ENV !== "production") globalForDb._pool = pool;

export const db = drizzle(pool, { schema, mode: "default" });
export { schema };
