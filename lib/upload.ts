import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";
import sharp from "sharp";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

/** บันทึกรูปอาหาร (บีบอัด+resize เป็น webp) เก็บนอก public — คืนชื่อไฟล์ */
export async function saveFoodImage(buffer: Buffer): Promise<string> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.webp`;
  await sharp(buffer)
    .rotate()
    .resize(1280, 1280, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(path.join(UPLOAD_DIR, name));
  return name;
}

/** อ่านไฟล์รูป (กัน path traversal) */
export async function readFoodImage(name: string): Promise<Buffer | null> {
  if (!/^[\w.-]+\.webp$/.test(name)) return null;
  try {
    return await fs.readFile(path.join(UPLOAD_DIR, name));
  } catch {
    return null;
  }
}
