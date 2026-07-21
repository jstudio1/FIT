import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";
import sharp from "sharp";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_INPUT_PIXELS = 40_000_000;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif", "heif", "tiff"]);

export async function validateFoodImage(buffer: Buffer): Promise<void> {
  if (buffer.length === 0) throw new Error("Empty image");
  const metadata = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "warning" }).metadata();
  if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) throw new Error("Unsupported image format");
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_INPUT_PIXELS) {
    throw new Error("Image dimensions are too large");
  }
}

/** บันทึกรูปอาหาร (บีบอัด+resize เป็น webp) เก็บนอก public — คืนชื่อไฟล์ */
export async function saveFoodImage(buffer: Buffer): Promise<string> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.webp`;
  await validateFoodImage(buffer);
  await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "warning" })
    .rotate()
    .resize(1280, 1280, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(path.join(UPLOAD_DIR, name));
  return name;
}

export async function deleteFoodImage(name: string): Promise<void> {
  if (!/^[\w.-]+\.webp$/.test(name)) return;
  try {
    await fs.unlink(path.join(UPLOAD_DIR, name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
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
