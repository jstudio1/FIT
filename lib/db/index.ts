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
  });

if (process.env.NODE_ENV !== "production") globalForDb._pool = pool;

export const db = drizzle(pool, { schema, mode: "default" });
export { schema };
