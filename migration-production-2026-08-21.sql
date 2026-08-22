-- =====================================================================
-- Migration สำหรับฐานข้อมูล production — อัปเดตจากโค้ด commit ล่าสุดที่เคย deploy
-- (1c0d2b5 "client tagging, monthly calendar, and BMI/TDEE calculator")
-- ไปเป็นโค้ดล่าสุดที่ push ขึ้น GitHub วันนี้ (2026-08-21)
--
-- ตรวจสอบแล้ว: เทียบ schema ของ wexplusc_fitpro.sql (ไฟล์ dump ฐานข้อมูล production
-- ที่ใช้ตั้งค่าเครื่อง dev ตอนแรก) กับฐานข้อมูล dev ล่าสุด พบว่าไฟล์นี้ครอบคลุม
-- ส่วนต่างทั้งหมดพอดี ไม่ขาดไม่เกิน (ทดสอบรันจริงกับสำเนาฐานข้อมูลก่อนส่งมอบไฟล์นี้แล้ว)
--
-- วิธีใช้: รันทั้งไฟล์ผ่าน phpMyAdmin (แท็บ SQL) หรือ mysql CLI บนโฮสต์จริง ครั้งเดียวจบ
-- ไม่มีคำสั่งลบ/แก้ไขข้อมูลเดิมเลยแม้แต่บรรทัดเดียว — ปลอดภัยกับข้อมูลลูกค้าจริง 100%
-- ทุกคำสั่งเป็น CREATE TABLE IF NOT EXISTS หรือ "เช็คก่อนเพิ่มคอลัมน์" (ดูด้านล่าง)
--
-- ✅ อัปเดต 2026-08-22: คำสั่งเพิ่มคอลัมน์ทุกอันเขียนใหม่เป็นแบบ "เช็คก่อนเพิ่ม"
-- (query ฝั่ง information_schema แล้วค่อย ALTER ผ่าน PREPARE/EXECUTE) แทนการเขียน
-- ALTER TABLE ตรงๆ — รันไฟล์นี้ซ้ำกี่ครั้งก็ได้ ไม่มีวันเจอ error "Duplicate column
-- name" หรือ "Table already exists" อีก ถ้าคอลัมน์/ตารางมีอยู่แล้วจะข้ามไปเงียบๆ
-- (ทดสอบแล้ว: รันซ้ำ 2 รอบติดกันบนตารางเดียวกัน ไม่ error ทั้งสองรอบ)
-- =====================================================================


-- ============ ชุดที่ 1: บันทึกผลคำนวณ BMI/TDEE + จับเวลาเทรนจริง ============

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

-- เขียนแบบ "เช็คก่อนเพิ่ม" (ไม่ใช่ ALTER ตรงๆ) เพราะฐานข้อมูล production อาจเคยรัน
-- migration บางไฟล์มาแล้วบางส่วน — ปลอดภัย รันซ้ำกี่ครั้งก็ได้ ไม่มีวัน error
-- "Duplicate column name" อีก (ต่างจากเดิมที่เขียนเป็น ALTER TABLE ตรงๆ)

SET @tbl = 'bookings';
SET @col = 'session_started_at';
SET @sql = (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col),
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` TIMESTAMP NULL')
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @tbl = 'bookings';
SET @col = 'session_ended_at';
SET @sql = (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col),
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` TIMESTAMP NULL')
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @tbl = 'bookings';
SET @col = 'duration_minutes';
SET @sql = (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col),
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` INT NULL')
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @tbl = 'bookings';
SET @col = 'duration_note';
SET @sql = (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col),
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` TEXT NULL')
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- ============ ชุดที่ 2: แชทเทรนเนอร์-ลูกเทรน (ข้อความ + รูปภาพ + ลบข้อความ) ============

CREATE TABLE IF NOT EXISTS chat_messages (
  id INT NOT NULL AUTO_INCREMENT,
  trainer_id INT NOT NULL,
  client_id INT NOT NULL,
  sender_id INT NOT NULL,
  body TEXT NULL,
  image_path VARCHAR(255) NULL,
  read_by_trainer_at TIMESTAMP NULL,
  read_by_client_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chat_conversation (trainer_id, client_id, created_at),
  CONSTRAINT chat_messages_trainer_fk FOREIGN KEY (trainer_id) REFERENCES users(id),
  CONSTRAINT chat_messages_client_fk FOREIGN KEY (client_id) REFERENCES users(id),
  CONSTRAINT chat_messages_sender_fk FOREIGN KEY (sender_id) REFERENCES users(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- ============ ชุดที่ 3: แต้มสะสม / Streak / Badge / Leaderboard ============

CREATE TABLE IF NOT EXISTS point_events (
  id INT NOT NULL AUTO_INCREMENT,
  client_id INT NOT NULL,
  points INT NOT NULL,
  reason VARCHAR(40) NOT NULL,
  ref_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_point_events_client (client_id, created_at),
  CONSTRAINT point_events_client_fk FOREIGN KEY (client_id) REFERENCES users(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS client_streaks (
  client_id INT NOT NULL,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_active_date DATE NULL,
  leaderboard_opt_in TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (client_id),
  CONSTRAINT client_streaks_client_fk FOREIGN KEY (client_id) REFERENCES users(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS client_badges (
  id INT NOT NULL AUTO_INCREMENT,
  client_id INT NOT NULL,
  code VARCHAR(40) NOT NULL,
  earned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_client_badge (client_id, code),
  CONSTRAINT client_badges_client_fk FOREIGN KEY (client_id) REFERENCES users(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- ============ ชุดที่ 4: คลังเมนูอาหารแนะนำ ============
-- หลังรันชุดนี้ ต้องรัน `npm run seed:menu` บนเซิร์ฟเวอร์เพื่อโหลดข้อมูลเมนู+รูปเข้าตาราง
-- (ต้องตั้ง PEXELS_API_KEY ใน .env ก่อน)

CREATE TABLE IF NOT EXISTS menu_items (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(191) NOT NULL,
  description TEXT NULL,
  ingredients JSON NULL,
  image_path VARCHAR(255) NULL,
  image_credit VARCHAR(191) NULL,
  calories INT NOT NULL,
  protein INT NOT NULL,
  carb INT NOT NULL,
  fat INT NOT NULL,
  tag_clean TINYINT(1) NOT NULL DEFAULT 0,
  tag_low_cal TINYINT(1) NOT NULL DEFAULT 0,
  tag_dessert TINYINT(1) NOT NULL DEFAULT 0,
  meal_type ENUM('BREAKFAST','LUNCH','DINNER','SNACK','ANY') NOT NULL DEFAULT 'ANY',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- ============ ชุดที่ 5: ตั้งค่าระบบสำหรับเจ้าของ (แชท/แต้มสะสม/ค่าดำเนินงาน) ============

-- (ค่าดำเนินงานกลุ่มนี้เดิมฝังเป็นค่าคงที่ในโค้ด — ย้ายมาให้เจ้าของระบบปรับได้จากหลังบ้าน
-- ส่วน login_theme คือธีมหน้า Login ที่เลือกได้ — เรียบง่าย / แบ่งครึ่งจอ+มือถือ / กรอบมือถือลอย
-- ทุกคอลัมน์เขียนแบบ "เช็คก่อนเพิ่ม" เหมือนชุดที่ 1 ด้านบน — ปลอดภัย รันซ้ำได้)

SET @tbl = 'site_settings';
SET @col = 'chat_enabled';
SET @sql = (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col),
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` TINYINT(1) NOT NULL DEFAULT 1')
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @tbl = 'site_settings';
SET @col = 'gamification_enabled';
SET @sql = (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col),
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` TINYINT(1) NOT NULL DEFAULT 1')
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @tbl = 'site_settings';
SET @col = 'points_training_completed';
SET @sql = (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col),
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` INT NOT NULL DEFAULT 10')
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @tbl = 'site_settings';
SET @col = 'points_food_logged';
SET @sql = (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col),
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` INT NOT NULL DEFAULT 2')
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @tbl = 'site_settings';
SET @col = 'points_badge_bonus';
SET @sql = (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col),
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` INT NOT NULL DEFAULT 20')
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @tbl = 'site_settings';
SET @col = 'booking_cancel_window_hours';
SET @sql = (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col),
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` INT NOT NULL DEFAULT 6')
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @tbl = 'site_settings';
SET @col = 'session_duration_min';
SET @sql = (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col),
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` INT NOT NULL DEFAULT 60')
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @tbl = 'site_settings';
SET @col = 'chat_max_message_length';
SET @sql = (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col),
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` INT NOT NULL DEFAULT 2000')
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @tbl = 'site_settings';
SET @col = 'chat_delete_window_min';
SET @sql = (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col),
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` INT NOT NULL DEFAULT 5')
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @tbl = 'site_settings';
SET @col = 'max_upload_size_mb';
SET @sql = (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col),
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` INT NOT NULL DEFAULT 10')
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @tbl = 'site_settings';
SET @col = 'login_theme';
SET @sql = (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col),
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` ENUM(''simple'',''split'',''frame'') NOT NULL DEFAULT ''simple''')
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================================
-- จบไฟล์ — หลังรันเสร็จ อย่าลืม:
--   1) รัน menu-items-seed-2026-08-21.sql แล้วตามด้วย menu-items-seed-2026-08-22.sql
--      เพื่อเติมข้อมูลเมนูแนะนำ (177 เมนู รวมรูปภาพ ไม่ต้องมี PEXELS_API_KEY แล้ว
--      เพราะรูปถูก push ขึ้น GitHub มาพร้อมโค้ดแล้ว — แค่ git pull ก็ครบ)
--   2) build + restart แอป (npm run build && npm start) เพื่อให้โค้ดใหม่ทำงาน
-- =====================================================================
