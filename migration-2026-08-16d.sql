-- Migration สำหรับฟีเจอร์ที่ทำวันนี้ (2026-08-16): แต้มสะสม / Streak / Badge / Leaderboard
-- รันทีละคำสั่งหรือทั้งไฟล์ผ่าน phpMyAdmin / mysql CLI บน production
-- ไม่มีคำสั่งลบ/แก้ข้อมูลเดิม ปลอดภัยกับข้อมูลที่มีอยู่ 100%
-- ถ้า error ว่า "Table already exists" แปลว่าคำสั่งนี้เคยรันไปแล้ว ข้ามได้เลย

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
