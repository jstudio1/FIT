-- Migration สำหรับฟีเจอร์ที่ทำวันนี้ (2026-08-16): จับเวลาเทรนจริง (เริ่ม/จบ + เหตุผลถ้าเวลาไม่ตรงกำหนด)
-- รันทีละคำสั่งหรือทั้งไฟล์ผ่าน phpMyAdmin / mysql CLI บน production
-- ไม่มีคำสั่งลบ/แก้ข้อมูลเดิม ปลอดภัยกับข้อมูลที่มีอยู่ 100%
-- ถ้า error ว่า "Duplicate column name" แปลว่าคำสั่งนี้เคยรันไปแล้ว ข้ามได้เลย

ALTER TABLE bookings ADD COLUMN session_started_at TIMESTAMP NULL;
ALTER TABLE bookings ADD COLUMN session_ended_at TIMESTAMP NULL;
ALTER TABLE bookings ADD COLUMN duration_minutes INT NULL;
ALTER TABLE bookings ADD COLUMN duration_note TEXT NULL;
