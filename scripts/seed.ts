import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { hashPassword } from "../lib/password";

async function main() {
  const username = process.env.OWNER_USERNAME ?? "owner";
  const password = process.env.OWNER_PASSWORD;
  const name = process.env.OWNER_NAME ?? "เจ้าของระบบ";

  if (!password || password.length < 12) {
    throw new Error("OWNER_PASSWORD is required and must be at least 12 characters");
  }

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existing[0]) {
    console.log(`ℹ️  บัญชี OWNER "${username}" มีอยู่แล้ว — ข้าม`);
    process.exit(0);
  }

  const passwordHash = await hashPassword(password);
  await db.insert(users).values({
    username,
    passwordHash,
    role: "OWNER",
    fullName: name,
  });

  console.log(`✅ สร้างบัญชี OWNER สำเร็จ`);
  console.log(`   username: ${username}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ seed ล้มเหลว:", e);
  process.exit(1);
});
