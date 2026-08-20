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

/* ---------------- รูปโปรไฟล์ ---------------- */

const AVATAR_DIR = path.join(process.cwd(), "uploads", "avatars");

/** บันทึกรูปโปรไฟล์ (ครอปสี่เหลี่ยมจัตุรัส 512x512, webp) เก็บนอก public — คืนชื่อไฟล์ */
export async function saveAvatarImage(buffer: Buffer): Promise<string> {
  await fs.mkdir(AVATAR_DIR, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.webp`;
  await validateFoodImage(buffer);
  await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "warning" })
    .rotate()
    .resize(512, 512, { fit: "cover", position: "attention" })
    .webp({ quality: 85 })
    .toFile(path.join(AVATAR_DIR, name));
  return name;
}

export async function deleteAvatarImage(name: string): Promise<void> {
  if (!/^[\w.-]+\.webp$/.test(name)) return;
  try {
    await fs.unlink(path.join(AVATAR_DIR, name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function readAvatarImage(name: string): Promise<Buffer | null> {
  if (!/^[\w.-]+\.webp$/.test(name)) return null;
  try {
    return await fs.readFile(path.join(AVATAR_DIR, name));
  } catch {
    return null;
  }
}

/* ---------------- รูปป็อปอัพประกาศ ---------------- */

const POPUP_DIR = path.join(process.cwd(), "uploads", "popups");

/** บันทึกรูปป็อปอัพ (คงสัดส่วนเดิม ไม่ครอป, webp) เก็บนอก public — คืนชื่อไฟล์ */
export async function savePopupImage(buffer: Buffer): Promise<string> {
  await fs.mkdir(POPUP_DIR, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.webp`;
  await validateFoodImage(buffer);
  await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "warning" })
    .rotate()
    .resize(1080, 1080, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(path.join(POPUP_DIR, name));
  return name;
}

export async function deletePopupImage(name: string): Promise<void> {
  if (!/^[\w.-]+\.webp$/.test(name)) return;
  try {
    await fs.unlink(path.join(POPUP_DIR, name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function readPopupImage(name: string): Promise<Buffer | null> {
  if (!/^[\w.-]+\.webp$/.test(name)) return null;
  try {
    return await fs.readFile(path.join(POPUP_DIR, name));
  } catch {
    return null;
  }
}

/* ---------------- รูปเมนูอาหารแนะนำ ---------------- */

const MENU_DIR = path.join(process.cwd(), "uploads", "menu");

/** บันทึกรูปเมนู (คงสัดส่วนเดิม, webp) เก็บนอก public — คืนชื่อไฟล์ */
export async function saveMenuImage(buffer: Buffer): Promise<string> {
  await fs.mkdir(MENU_DIR, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.webp`;
  await validateFoodImage(buffer);
  await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "warning" })
    .rotate()
    .resize(900, 900, { fit: "cover", position: "attention" })
    .webp({ quality: 82 })
    .toFile(path.join(MENU_DIR, name));
  return name;
}

export async function deleteMenuImage(name: string): Promise<void> {
  if (!/^[\w.-]+\.webp$/.test(name)) return;
  try {
    await fs.unlink(path.join(MENU_DIR, name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function readMenuImage(name: string): Promise<Buffer | null> {
  if (!/^[\w.-]+\.webp$/.test(name)) return null;
  try {
    return await fs.readFile(path.join(MENU_DIR, name));
  } catch {
    return null;
  }
}

/* ---------------- รูปแนบในแชท ---------------- */

const CHAT_DIR = path.join(process.cwd(), "uploads", "chat");

/** บันทึกรูปแนบในแชท (คงสัดส่วนเดิม ไม่ครอป, webp) เก็บนอก public — คืนชื่อไฟล์ */
export async function saveChatImage(buffer: Buffer): Promise<string> {
  await fs.mkdir(CHAT_DIR, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.webp`;
  await validateFoodImage(buffer);
  await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "warning" })
    .rotate()
    .resize(1280, 1280, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(path.join(CHAT_DIR, name));
  return name;
}

export async function deleteChatImage(name: string): Promise<void> {
  if (!/^[\w.-]+\.webp$/.test(name)) return;
  try {
    await fs.unlink(path.join(CHAT_DIR, name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function readChatImage(name: string): Promise<Buffer | null> {
  if (!/^[\w.-]+\.webp$/.test(name)) return null;
  try {
    return await fs.readFile(path.join(CHAT_DIR, name));
  } catch {
    return null;
  }
}
