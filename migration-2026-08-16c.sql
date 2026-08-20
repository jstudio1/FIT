-- Migration สำหรับฟีเจอร์ที่ทำวันนี้ (2026-08-16): แชทระหว่างเทรนเนอร์-ลูกเทรน
-- รันทีละคำสั่งหรือทั้งไฟล์ผ่าน phpMyAdmin / mysql CLI บน production
-- ไม่มีคำสั่งลบ/แก้ข้อมูลเดิม ปลอดภัยกับข้อมูลที่มีอยู่ 100%
-- ถ้า error ว่า "Table already exists" แปลว่าคำสั่งนี้เคยรันไปแล้ว ข้ามได้เลย

CREATE TABLE IF NOT EXISTS chat_messages (
  id INT NOT NULL AUTO_INCREMENT,
  trainer_id INT NOT NULL,
  client_id INT NOT NULL,
  sender_id INT NOT NULL,
  body TEXT NOT NULL,
  read_by_trainer_at TIMESTAMP NULL,
  read_by_client_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chat_conversation (trainer_id, client_id, created_at),
  CONSTRAINT chat_messages_trainer_fk FOREIGN KEY (trainer_id) REFERENCES users(id),
  CONSTRAINT chat_messages_client_fk FOREIGN KEY (client_id) REFERENCES users(id),
  CONSTRAINT chat_messages_sender_fk FOREIGN KEY (sender_id) REFERENCES users(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
