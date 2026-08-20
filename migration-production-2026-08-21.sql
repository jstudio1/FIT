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
-- ทุกคำสั่งเป็น CREATE TABLE IF NOT EXISTS หรือ ALTER TABLE ADD COLUMN เท่านั้น
--
-- ถ้าฐานข้อมูล production ของคุณเคยรันไฟล์ migration-2026-08-16*.sql หรือ
-- migration-2026-08-21.sql ไปแล้วบางไฟล์ (ไม่ครบ) อาจเจอ error "Table already exists"
-- หรือ "Duplicate column name" ในบางคำสั่ง — แปลว่าคำสั่งนั้นเคยรันไปแล้ว ข้ามไปคำสั่งถัดไปได้เลย
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

ALTER TABLE bookings ADD COLUMN session_started_at TIMESTAMP NULL;
ALTER TABLE bookings ADD COLUMN session_ended_at TIMESTAMP NULL;
ALTER TABLE bookings ADD COLUMN duration_minutes INT NULL;
ALTER TABLE bookings ADD COLUMN duration_note TEXT NULL;


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

ALTER TABLE site_settings ADD COLUMN chat_enabled TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE site_settings ADD COLUMN gamification_enabled TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE site_settings ADD COLUMN points_training_completed INT NOT NULL DEFAULT 10;
ALTER TABLE site_settings ADD COLUMN points_food_logged INT NOT NULL DEFAULT 2;
ALTER TABLE site_settings ADD COLUMN points_badge_bonus INT NOT NULL DEFAULT 20;

-- ค่าดำเนินงานที่เดิมฝังเป็นค่าคงที่ในโค้ด — ย้ายมาให้เจ้าของระบบปรับได้จากหลังบ้าน
ALTER TABLE site_settings
  ADD COLUMN booking_cancel_window_hours INT NOT NULL DEFAULT 6,
  ADD COLUMN session_duration_min INT NOT NULL DEFAULT 60,
  ADD COLUMN chat_max_message_length INT NOT NULL DEFAULT 2000,
  ADD COLUMN chat_delete_window_min INT NOT NULL DEFAULT 5,
  ADD COLUMN max_upload_size_mb INT NOT NULL DEFAULT 10;

-- =====================================================================
-- จบไฟล์ — หลังรันเสร็จ อย่าลืม:
--   1) รัน `npm run seed:menu` บนเซิร์ฟเวอร์ เพื่อโหลดเมนูแนะนำ (ต้องมี PEXELS_API_KEY ใน .env)
--   2) เพิ่ม PEXELS_API_KEY ใน .env บนเซิร์ฟเวอร์ (ดูตัวอย่างใน .env.example)
--   3) build + restart แอป (npm run build && npm start) เพื่อให้โค้ดใหม่ทำงาน
-- =====================================================================
