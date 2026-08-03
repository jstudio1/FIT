-- Migration สำหรับฟีเจอร์ที่ทำวันนี้ (2026-08-03): แท็กลูกเทรน + วันเกิดลูกเทรน
-- รันทีละคำสั่งหรือทั้งไฟล์ผ่าน phpMyAdmin / mysql CLI บน production
-- ไม่มีคำสั่งลบ/แก้ข้อมูลเดิม ปลอดภัยกับข้อมูลที่มีอยู่ 100%
-- ถ้า error ว่า "Table already exists" หรือ "Duplicate column name" แปลว่าคำสั่งนั้นเคยรันไปแล้ว ข้ามได้เลย

-- 1) แท็ก/กลุ่มลูกเทรน (เทรนเนอร์สร้างเอง เช่น "ลดน้ำหนัก", "เพิ่มกล้าม")
CREATE TABLE IF NOT EXISTS client_tags (
  id INT NOT NULL AUTO_INCREMENT,
  trainer_id INT NOT NULL,
  name VARCHAR(40) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT 'teal',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_trainer_tag_name (trainer_id, name),
  CONSTRAINT client_tags_trainer_fk FOREIGN KEY (trainer_id) REFERENCES users(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS client_tag_links (
  tag_id INT NOT NULL,
  client_id INT NOT NULL,
  PRIMARY KEY (tag_id, client_id),
  CONSTRAINT client_tag_links_tag_fk FOREIGN KEY (tag_id) REFERENCES client_tags(id),
  CONSTRAINT client_tag_links_client_fk FOREIGN KEY (client_id) REFERENCES users(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2) วันเกิดลูกเทรน (สำหรับคำนวณอายุอัตโนมัติในเครื่องมือคำนวณ BMI/TDEE)
ALTER TABLE client_profiles ADD COLUMN birth_date DATE NULL;
