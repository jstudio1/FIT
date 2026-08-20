-- Migration สำหรับฟีเจอร์ที่ทำวันนี้ (2026-08-16): คลังเมนูอาหารแนะนำ (คลีน/แคลน้อย/ตามแคลที่เหลือ)
-- รันทีละคำสั่งหรือทั้งไฟล์ผ่าน phpMyAdmin / mysql CLI บน production
-- ไม่มีคำสั่งลบ/แก้ข้อมูลเดิม ปลอดภัยกับข้อมูลที่มีอยู่ 100%
-- ถ้า error ว่า "Table already exists" แปลว่าคำสั่งนี้เคยรันไปแล้ว ข้ามได้เลย
-- หลังรันไฟล์นี้ ต้องรัน `npm run seed:menu` เพื่อโหลดข้อมูลเมนู+รูปเข้าตาราง (ต้องตั้ง PEXELS_API_KEY ใน .env ก่อน)

CREATE TABLE IF NOT EXISTS menu_items (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(191) NOT NULL,
  description TEXT NULL,
  image_path VARCHAR(255) NULL,
  image_credit VARCHAR(191) NULL,
  calories INT NOT NULL,
  protein INT NOT NULL,
  carb INT NOT NULL,
  fat INT NOT NULL,
  tag_clean TINYINT(1) NOT NULL DEFAULT 0,
  tag_low_cal TINYINT(1) NOT NULL DEFAULT 0,
  meal_type ENUM('BREAKFAST','LUNCH','DINNER','SNACK','ANY') NOT NULL DEFAULT 'ANY',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
