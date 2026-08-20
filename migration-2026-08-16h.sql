-- Migration สำหรับฟีเจอร์ที่ทำวันนี้ (2026-08-16): ตั้งค่าระบบแชท/แต้มสะสม สำหรับ owner
-- รันทีละคำสั่งหรือทั้งไฟล์ผ่าน phpMyAdmin / mysql CLI บน production
-- ไม่มีคำสั่งลบ/แก้ข้อมูลเดิม ปลอดภัยกับข้อมูลที่มีอยู่ 100%
-- ถ้า error ว่า "Duplicate column name" แปลว่าคำสั่งนี้เคยรันไปแล้ว ข้ามได้เลย

ALTER TABLE site_settings ADD COLUMN chat_enabled TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE site_settings ADD COLUMN gamification_enabled TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE site_settings ADD COLUMN points_training_completed INT NOT NULL DEFAULT 10;
ALTER TABLE site_settings ADD COLUMN points_food_logged INT NOT NULL DEFAULT 2;
ALTER TABLE site_settings ADD COLUMN points_badge_bonus INT NOT NULL DEFAULT 20;
