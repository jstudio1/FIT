-- Migration รวมทุกการเปลี่ยนแปลง schema ที่ทำระหว่าง session นี้
-- รันบนฐานข้อมูล production เพื่อให้ตรงกับโค้ดล่าสุดที่ push ขึ้น GitHub
--
-- วิธีใช้: รันทีละคำสั่ง (หรือทั้งไฟล์) ผ่าน phpMyAdmin / mysql CLI บนโฮสต์
-- ถ้าคำสั่งไหน error ว่า "Table already exists" หรือ "Duplicate column name"
-- แปลว่าคำสั่งนั้นเคยรันไปแล้ว ข้ามไปคำสั่งถัดไปได้เลย ไม่มีผลเสีย
-- (ไฟล์นี้ไม่มีคำสั่งลบข้อมูล ปลอดภัยกับข้อมูลเดิมทั้งหมด)

-- 1) ตั้งค่าเว็บไซต์ / SEO
CREATE TABLE IF NOT EXISTS site_settings (
  id INT NOT NULL,
  site_name VARCHAR(128) NOT NULL DEFAULT '',
  meta_title VARCHAR(191) NOT NULL DEFAULT '',
  meta_description VARCHAR(300) NOT NULL DEFAULT '',
  keywords VARCHAR(300) NULL,
  contact_email VARCHAR(128) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2) เวลาทำการต่อเทรนเนอร์ (ตั้งเวลาทำการ / ปิดรับช่วงวันที่)
ALTER TABLE trainer_settings
  ADD COLUMN open_hour INT NOT NULL DEFAULT 8,
  ADD COLUMN close_hour INT NOT NULL DEFAULT 20;

-- 3) พักประจำวัน (ไม่รับเทรนซ้ำทุกวัน เช่น พักเที่ยง)
CREATE TABLE IF NOT EXISTS recurring_breaks (
  id INT NOT NULL AUTO_INCREMENT,
  trainer_id INT NOT NULL,
  hour INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_trainer_hour (trainer_id, hour),
  CONSTRAINT recurring_breaks_trainer_id_fk FOREIGN KEY (trainer_id) REFERENCES users(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4) ไดอารี่อาหาร (คาร์บ/โปรตีน/ไขมัน)
ALTER TABLE food_comments
  ADD COLUMN carbs INT NULL,
  ADD COLUMN protein INT NULL,
  ADD COLUMN fat INT NULL;

-- 5) ประวัติการยกเลิกนัด (สำหรับหน้ารายงาน)
CREATE TABLE IF NOT EXISTS booking_cancellations (
  id INT NOT NULL AUTO_INCREMENT,
  trainer_id INT NOT NULL,
  client_id INT NOT NULL,
  date DATE NOT NULL,
  hour INT NOT NULL,
  cancelled_by ENUM('CLIENT','TRAINER') NOT NULL,
  cancelled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT booking_cancellations_trainer_fk FOREIGN KEY (trainer_id) REFERENCES users(id),
  CONSTRAINT booking_cancellations_client_fk FOREIGN KEY (client_id) REFERENCES users(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 6) Security hardening (apply once; ignore duplicate-column if already applied)
ALTER TABLE users ADD COLUMN session_version INT NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS slot_locks (
  trainer_id INT NOT NULL, date DATE NOT NULL, hour INT NOT NULL,
  PRIMARY KEY (trainer_id, date, hour),
  CONSTRAINT slot_locks_trainer_fk FOREIGN KEY (trainer_id) REFERENCES users(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_attempts (
  id INT NOT NULL AUTO_INCREMENT, identifier_hash VARCHAR(64) NOT NULL,
  ip_hash VARCHAR(64) NOT NULL, success BOOLEAN NOT NULL DEFAULT FALSE,
  attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_login_identifier_time (identifier_hash, attempted_at),
  KEY idx_login_ip_time (ip_hash, attempted_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT NOT NULL AUTO_INCREMENT, actor_id INT NULL, action VARCHAR(64) NOT NULL,
  resource_type VARCHAR(64) NOT NULL, resource_id VARCHAR(128) NULL,
  subject_user_id INT NULL, ip_hash VARCHAR(64) NULL, metadata TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id),
  KEY idx_audit_actor_time (actor_id, created_at),
  KEY idx_audit_subject_time (subject_user_id, created_at),
  CONSTRAINT audit_actor_fk FOREIGN KEY (actor_id) REFERENCES users(id),
  CONSTRAINT audit_subject_fk FOREIGN KEY (subject_user_id) REFERENCES users(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS privacy_consents (
  user_id INT NOT NULL, policy_version VARCHAR(32) NOT NULL,
  accepted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, withdrawn_at TIMESTAMP NULL,
  PRIMARY KEY (user_id), CONSTRAINT privacy_consents_user_fk FOREIGN KEY (user_id) REFERENCES users(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS privacy_requests (
  id INT NOT NULL AUTO_INCREMENT, user_id INT NOT NULL,
  request_type ENUM('EXPORT','DELETE') NOT NULL,
  status ENUM('PENDING','COMPLETED','REJECTED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, completed_at TIMESTAMP NULL,
  PRIMARY KEY (id), KEY idx_privacy_request_user_time (user_id, created_at),
  CONSTRAINT privacy_requests_user_fk FOREIGN KEY (user_id) REFERENCES users(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX idx_bookings_client_date_hour ON bookings(client_id, date, hour);
CREATE INDEX idx_results_client_measured ON session_results(client_id, measured_at);
CREATE INDEX idx_food_client_created ON food_logs(client_id, created_at);
CREATE INDEX idx_notifications_user_read_created ON notifications(user_id, is_read, created_at);
