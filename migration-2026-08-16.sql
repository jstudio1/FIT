-- Migration สำหรับฟีเจอร์ที่ทำวันนี้ (2026-08-16): บันทึกผลคำนวณ BMI/TDEE/แมคโคร
-- รันทีละคำสั่งหรือทั้งไฟล์ผ่าน phpMyAdmin / mysql CLI บน production
-- ไม่มีคำสั่งลบ/แก้ข้อมูลเดิม ปลอดภัยกับข้อมูลที่มีอยู่ 100%
-- ถ้า error ว่า "Table already exists" แปลว่าคำสั่งนี้เคยรันไปแล้ว ข้ามได้เลย

CREATE TABLE IF NOT EXISTS calculator_results (
  id INT NOT NULL AUTO_INCREMENT,
  created_by INT NOT NULL,
  client_id INT NULL,
  gender ENUM('MALE','FEMALE') NOT NULL,
  age INT NOT NULL,
  height DOUBLE NOT NULL,
  weight DOUBLE NOT NULL,
  activity DOUBLE NOT NULL,
  goal ENUM('cut','maintain','bulk') NOT NULL,
  bmi DOUBLE NOT NULL,
  bmr INT NOT NULL,
  tdee INT NOT NULL,
  calories INT NOT NULL,
  protein INT NOT NULL,
  carb INT NOT NULL,
  fat INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_calc_results_created_by (created_by, created_at),
  CONSTRAINT calculator_results_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT calculator_results_client_fk FOREIGN KEY (client_id) REFERENCES users(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
