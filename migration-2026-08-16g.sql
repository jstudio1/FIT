-- Migration สำหรับฟีเจอร์ที่ทำวันนี้ (2026-08-16): แท็กขนม/ของหวานเพื่อสุขภาพ
-- รันทีละคำสั่งหรือทั้งไฟล์ผ่าน phpMyAdmin / mysql CLI บน production
-- ไม่มีคำสั่งลบ/แก้ข้อมูลเดิม ปลอดภัยกับข้อมูลที่มีอยู่ 100%
-- ถ้า error ว่า "Duplicate column name" แปลว่าคำสั่งนี้เคยรันไปแล้ว ข้ามได้เลย
-- หลังรันไฟล์นี้ ต้องรัน `npm run seed:menu` อีกครั้งเพื่อโหลดเมนูชุดใหม่ + อัปเดตแท็กของเดิม

ALTER TABLE menu_items ADD COLUMN tag_dessert TINYINT(1) NOT NULL DEFAULT 0;
