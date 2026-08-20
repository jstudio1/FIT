-- Migration สำหรับฟีเจอร์ที่ทำวันนี้ (2026-08-16): ปรับปรุงระบบแชท (รูปภาพ, ลบข้อความ)
-- รันทีละคำสั่งหรือทั้งไฟล์ผ่าน phpMyAdmin / mysql CLI บน production
-- ไม่มีคำสั่งลบ/แก้ข้อมูลเดิม ปลอดภัยกับข้อมูลที่มีอยู่ 100%
-- ถ้า error ว่า "Duplicate column name" แปลว่าคำสั่งนี้เคยรันไปแล้ว ข้ามได้เลย

ALTER TABLE chat_messages MODIFY COLUMN body TEXT NULL;
ALTER TABLE chat_messages ADD COLUMN image_path VARCHAR(255) NULL;
ALTER TABLE chat_messages ADD COLUMN deleted_at TIMESTAMP NULL;
