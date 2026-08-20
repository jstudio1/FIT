-- ย้ายค่าคงที่ทางธุรกิจที่เดิมฝังในโค้ด มาเป็นค่าที่เจ้าของระบบปรับได้จากหลังบ้าน
ALTER TABLE site_settings
  ADD COLUMN booking_cancel_window_hours INT NOT NULL DEFAULT 6,
  ADD COLUMN session_duration_min INT NOT NULL DEFAULT 60,
  ADD COLUMN chat_max_message_length INT NOT NULL DEFAULT 2000,
  ADD COLUMN chat_delete_window_min INT NOT NULL DEFAULT 5,
  ADD COLUMN max_upload_size_mb INT NOT NULL DEFAULT 10;
