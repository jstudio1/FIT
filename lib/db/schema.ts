import {
  mysqlTable,
  int,
  varchar,
  boolean,
  timestamp,
  text,
  date,
  double,
  mysqlEnum,
  unique,
  index,
  primaryKey,
  json,
  type AnyMySqlColumn,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/* ---------------- Users (owner / trainer / client) ---------------- */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["OWNER", "TRAINER", "CLIENT"]).notNull(),
  // สำหรับ CLIENT: id ของเทรนเนอร์เจ้าของ (ของใครของมัน)
  trainerId: int("trainer_id").references((): AnyMySqlColumn => users.id),
  fullName: varchar("full_name", { length: 128 }).notNull(),
  active: boolean("active").notNull().default(true),
  sessionVersion: int("session_version").notNull().default(1),
  // โปรไฟล์ส่วนตัว (เติมได้เอง)
  nickname: varchar("nickname", { length: 64 }),
  bio: text("bio"),
  email: varchar("email", { length: 191 }),
  phone: varchar("phone", { length: 32 }),
  avatarPath: varchar("avatar_path", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ---------------- Client profile (ประวัติลูกเทรน) ---------------- */
export const clientProfiles = mysqlTable("client_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  goals: text("goals"),
  healthHistory: text("health_history"),
  birthDate: date("birth_date", { mode: "string" }),
  // ข้อมูลร่างกายตอนเริ่มต้น
  startWeight: double("start_weight"),
  startHeight: double("start_height"),
  startWaist: double("start_waist"),
  startMuscleMass: double("start_muscle_mass"),
  startBodyFat: double("start_body_fat"),
  // พื้นฐาน/ไลฟ์สไตล์
  exerciseBackground: text("exercise_background"),
  sleepPattern: varchar("sleep_pattern", { length: 255 }),
  workPattern: varchar("work_pattern", { length: 255 }),
  daysPerWeek: int("days_per_week"),
  mealsPerDay: int("meals_per_day"),
  alcoholFrequency: varchar("alcohol_frequency", { length: 64 }),
  disciplineNote: text("discipline_note"),
  // เป้าหมายโภชนาการต่อวันที่เทรนเนอร์กำหนดให้
  targetCalories: int("target_calories"),
  targetCarbs: int("target_carbs"), // กรัม
  targetProtein: int("target_protein"), // กรัม
  targetFat: int("target_fat"), // กรัม
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

/* ---------------- Client tags (เทรนเนอร์จัดกลุ่มลูกเทรนเอง เช่น "ลดน้ำหนัก") ---------------- */
export const clientTags = mysqlTable(
  "client_tags",
  {
    id: int("id").autoincrement().primaryKey(),
    trainerId: int("trainer_id")
      .notNull()
      .references(() => users.id),
    name: varchar("name", { length: 40 }).notNull(),
    color: varchar("color", { length: 20 }).notNull().default("teal"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("uniq_trainer_tag_name").on(t.trainerId, t.name)],
);

export const clientTagLinks = mysqlTable(
  "client_tag_links",
  {
    tagId: int("tag_id")
      .notNull()
      .references(() => clientTags.id),
    clientId: int("client_id")
      .notNull()
      .references(() => users.id),
  },
  (t) => [primaryKey({ columns: [t.tagId, t.clientId] })],
);

/* ---------------- Trainer settings (เปิด/ปิดรับจอง) ---------------- */
export const trainerSettings = mysqlTable("trainer_settings", {
  trainerId: int("trainer_id")
    .primaryKey()
    .references(() => users.id),
  bookingOpen: boolean("booking_open").notNull().default(true),
  openHour: int("open_hour").notNull().default(8),
  closeHour: int("close_hour").notNull().default(20),
  // ตรวจอาหารอัตโนมัติด้วย AI (Google Vision + USDA FDC) แทนการกรอกเอง
  autoNutritionEnabled: boolean("auto_nutrition_enabled").notNull().default(false),
});

/* ---------------- Bookings (ตารางจอง) ---------------- */
export const bookings = mysqlTable(
  "bookings",
  {
    id: int("id").autoincrement().primaryKey(),
    clientId: int("client_id")
      .notNull()
      .references(() => users.id),
    trainerId: int("trainer_id")
      .notNull()
      .references(() => users.id),
    date: date("date", { mode: "string" }).notNull(),
    hour: int("hour").notNull(), // 8..19 (1 ช่อง = 1 ชั่วโมง)
    status: mysqlEnum("status", ["BOOKED", "COMPLETED", "NO_SHOW"]) // ยกเลิก = ลบแถว เพื่อให้ช่องว่างจองใหม่ได้
      .notNull()
      .default("BOOKED"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    // จับเวลาเทรนจริง — เทรนเนอร์กดเริ่ม/จบ ตอนถึงเวลานัด
    sessionStartedAt: timestamp("session_started_at"),
    sessionEndedAt: timestamp("session_ended_at"),
    durationMinutes: int("duration_minutes"), // เวลาที่ใช้จริง (นาที)
    // เหตุผล — บังคับกรอกถ้าเวลาที่ใช้จริงไม่ตรง 1 ชั่วโมงตามกำหนด
    durationNote: text("duration_note"),
  },
  (t) => [unique("uniq_slot").on(t.trainerId, t.date, t.hour)], // กันจองซ้อน
);

/* ---------------- Blocked slots (ช่วงเวลาที่เทรนเนอร์ปิด) ---------------- */
export const blockedSlots = mysqlTable(
  "blocked_slots",
  {
    id: int("id").autoincrement().primaryKey(),
    trainerId: int("trainer_id")
      .notNull()
      .references(() => users.id),
    date: date("date", { mode: "string" }).notNull(),
    hour: int("hour").notNull(),
    reason: varchar("reason", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("uniq_block").on(t.trainerId, t.date, t.hour)],
);

/* Serializes booking/block mutations for one trainer/date/hour. */
export const slotLocks = mysqlTable(
  "slot_locks",
  {
    trainerId: int("trainer_id").notNull().references(() => users.id),
    date: date("date", { mode: "string" }).notNull(),
    hour: int("hour").notNull(),
  },
  (t) => [primaryKey({ columns: [t.trainerId, t.date, t.hour] })],
);

/* ---------------- Recurring breaks (ช่วงเวลาที่ไม่รับเทรนทุกวัน เช่น พักเที่ยง) ---------------- */
export const recurringBreaks = mysqlTable(
  "recurring_breaks",
  {
    id: int("id").autoincrement().primaryKey(),
    trainerId: int("trainer_id")
      .notNull()
      .references(() => users.id),
    hour: int("hour").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("uniq_trainer_hour").on(t.trainerId, t.hour)],
);

/* ---------------- Booking cancellations (log ประวัติการยกเลิก — bookings ถูกลบตอนยกเลิกจริง) ---------------- */
export const bookingCancellations = mysqlTable("booking_cancellations", {
  id: int("id").autoincrement().primaryKey(),
  trainerId: int("trainer_id")
    .notNull()
    .references(() => users.id),
  clientId: int("client_id")
    .notNull()
    .references(() => users.id),
  date: date("date", { mode: "string" }).notNull(),
  hour: int("hour").notNull(),
  cancelledBy: mysqlEnum("cancelled_by", ["CLIENT", "TRAINER"]).notNull(),
  cancelledAt: timestamp("cancelled_at").notNull().defaultNow(),
});

/* ---------------- Session results (ผลลัพธ์การเทรน) ---------------- */
export const sessionResults = mysqlTable("session_results", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("client_id")
    .notNull()
    .references(() => users.id),
  bookingId: int("booking_id").references(() => bookings.id),
  weight: double("weight"),
  waist: double("waist"),
  muscleMass: double("muscle_mass"),
  bodyFat: double("body_fat"),
  phase: mysqlEnum("phase", ["PRE", "POST"]).notNull().default("POST"),
  note: text("note"),
  measuredAt: timestamp("measured_at").notNull().defaultNow(),
});

/* ---------------- Calculator results (ผลคำนวณ BMI/TDEE/แมคโครที่บันทึกไว้) ---------------- */
export const calculatorResults = mysqlTable(
  "calculator_results",
  {
    id: int("id").autoincrement().primaryKey(),
    createdBy: int("created_by")
      .notNull()
      .references(() => users.id),
    // ลูกเทรนที่ผลนี้เกี่ยวข้องด้วย (เทรนเนอร์เลือกจาก dropdown, ลูกเทรนคือตัวเอง) — ไม่บังคับ
    clientId: int("client_id").references(() => users.id),
    gender: mysqlEnum("gender", ["MALE", "FEMALE"]).notNull(),
    age: int("age").notNull(),
    height: double("height").notNull(),
    weight: double("weight").notNull(),
    activity: double("activity").notNull(),
    goal: mysqlEnum("goal", ["cut", "maintain", "bulk"]).notNull(),
    bmi: double("bmi").notNull(),
    bmr: int("bmr").notNull(),
    tdee: int("tdee").notNull(),
    calories: int("calories").notNull(),
    protein: int("protein").notNull(),
    carb: int("carb").notNull(),
    fat: int("fat").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_calc_results_created_by").on(t.createdBy, t.createdAt)],
);

/* ---------------- Chat (แชทระหว่างเทรนเนอร์-ลูกเทรน คนละคู่ต่อ 1 บทสนทนา) ---------------- */
export const chatMessages = mysqlTable(
  "chat_messages",
  {
    id: int("id").autoincrement().primaryKey(),
    trainerId: int("trainer_id")
      .notNull()
      .references(() => users.id),
    clientId: int("client_id")
      .notNull()
      .references(() => users.id),
    senderId: int("sender_id")
      .notNull()
      .references(() => users.id),
    body: text("body"), // null ได้ถ้าเป็นข้อความรูปภาพล้วน
    imagePath: varchar("image_path", { length: 255 }), // ไฟล์ในโฟลเดอร์ uploads/chat
    // มีค่า = อีกฝ่ายเปิดอ่านแล้ว ณ เวลานั้น
    readByTrainerAt: timestamp("read_by_trainer_at"),
    readByClientAt: timestamp("read_by_client_at"),
    deletedAt: timestamp("deleted_at"), // ลบเอง (ยังเก็บแถวไว้เพื่อไม่ให้ลำดับ id/เวลาสลับ)
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_chat_conversation").on(t.trainerId, t.clientId, t.createdAt),
  ],
);

/* ---------------- Gamification (แต้มสะสม / Streak / Badge / Leaderboard) ---------------- */
export const pointEvents = mysqlTable(
  "point_events",
  {
    id: int("id").autoincrement().primaryKey(),
    clientId: int("client_id")
      .notNull()
      .references(() => users.id),
    points: int("points").notNull(),
    reason: varchar("reason", { length: 40 }).notNull(), // เช่น TRAINING_COMPLETED, FOOD_LOGGED, BADGE_BONUS
    refId: int("ref_id"), // id ของ booking/food log ที่เกี่ยวข้อง (ถ้ามี)
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_point_events_client").on(t.clientId, t.createdAt)],
);

export const clientStreaks = mysqlTable("client_streaks", {
  clientId: int("client_id")
    .primaryKey()
    .references(() => users.id),
  currentStreak: int("current_streak").notNull().default(0),
  longestStreak: int("longest_streak").notNull().default(0),
  // วันล่าสุด (yyyy-mm-dd) ที่มีกิจกรรมนับ streak — กันนับซ้ำถ้าทำหลายอย่างวันเดียวกัน
  lastActiveDate: date("last_active_date", { mode: "string" }),
  // ลูกเทรนเลือกเองว่าจะให้ชื่อ/แต้มไปโชว์ใน Leaderboard หรือไม่ (ปิดไว้เป็นค่าเริ่มต้น)
  leaderboardOptIn: boolean("leaderboard_opt_in").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const clientBadges = mysqlTable(
  "client_badges",
  {
    id: int("id").autoincrement().primaryKey(),
    clientId: int("client_id")
      .notNull()
      .references(() => users.id),
    code: varchar("code", { length: 40 }).notNull(), // อ้างอิงคีย์ badge ที่กำหนดไว้ในโค้ด (lib/gamification.ts)
    earnedAt: timestamp("earned_at").notNull().defaultNow(),
  },
  (t) => [unique("uniq_client_badge").on(t.clientId, t.code)],
);

/* ---------------- Food logs (รูปอาหารที่ลูกค้าส่ง) ---------------- */
export const foodLogs = mysqlTable("food_logs", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("client_id")
    .notNull()
    .references(() => users.id),
  imagePath: varchar("image_path", { length: 255 }).notNull(),
  mealType: mysqlEnum("meal_type", ["BREAKFAST", "LUNCH", "DINNER", "SNACK"]).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // ผลคำนวณอัตโนมัติจาก AI (Google Vision + USDA FDC) — แยกจาก food_comments โดยเจตนา
  autoStatus: mysqlEnum("auto_status", ["NONE", "PROCESSING", "DONE", "FAILED"])
    .notNull()
    .default("NONE"),
  autoCalories: int("auto_calories"),
  autoCarbs: int("auto_carbs"), // กรัม
  autoProtein: int("auto_protein"), // กรัม
  autoFat: int("auto_fat"), // กรัม
  autoLabel: varchar("auto_label", { length: 255 }), // ชื่ออาหารที่ AI ตรวจพบ เช่น "ข้าวผัด, ไข่ดาว"
  // สถานะรวม: ตรวจแล้วหรือยัง (ไม่ว่าจะโดย AI หรือเทรนเนอร์)
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: mysqlEnum("reviewed_by", ["AUTO", "TRAINER"]),
});

/* ---------------- Food comments (เทรนเนอร์ตรวจ/คอมเมนต์) ---------------- */
export const foodComments = mysqlTable("food_comments", {
  id: int("id").autoincrement().primaryKey(),
  foodLogId: int("food_log_id")
    .notNull()
    .references(() => foodLogs.id),
  trainerId: int("trainer_id")
    .notNull()
    .references(() => users.id),
  comment: text("comment"),
  calories: int("calories"),
  carbs: int("carbs"), // กรัม
  protein: int("protein"), // กรัม
  fat: int("fat"), // กรัม
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ---------------- Menu items (คลังเมนูอาหารแนะนำ — คลีน/แคลน้อย พร้อมรูป) ---------------- */
export const menuItems = mysqlTable("menu_items", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 191 }).notNull(),
  description: text("description"),
  // ส่วนประกอบหลัก (สูงสุด 6 รายการ — ใช้แสดงไดอะแกรมเส้นโยงในหน้ารายละเอียดเมนู)
  ingredients: json("ingredients").$type<string[]>(),
  imagePath: varchar("image_path", { length: 255 }), // ไฟล์ในโฟลเดอร์ uploads/menu (ดาวน์โหลดเก็บเองครั้งเดียวตอน seed)
  imageCredit: varchar("image_credit", { length: 191 }), // เครดิตช่างภาพ ตามเงื่อนไขการใช้งานของ Pexels
  calories: int("calories").notNull(),
  protein: int("protein").notNull(), // กรัม
  carb: int("carb").notNull(), // กรัม
  fat: int("fat").notNull(), // กรัม
  tagClean: boolean("tag_clean").notNull().default(false), // อาหารคลีน
  tagLowCal: boolean("tag_low_cal").notNull().default(false), // อาหารทั่วไปแต่แคลน้อย
  tagDessert: boolean("tag_dessert").notNull().default(false), // ขนม/ของหวานเพื่อสุขภาพ
  mealType: mysqlEnum("meal_type", ["BREAKFAST", "LUNCH", "DINNER", "SNACK", "ANY"])
    .notNull()
    .default("ANY"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ---------------- Notifications (แจ้งเตือนในเว็บ) ---------------- */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id")
    .notNull()
    .references(() => users.id),
  type: varchar("type", { length: 32 }).notNull().default("info"),
  title: varchar("title", { length: 191 }).notNull(),
  message: text("message"),
  isRead: boolean("is_read").notNull().default(false),
  scheduledFor: timestamp("scheduled_for"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const loginAttempts = mysqlTable(
  "login_attempts",
  {
    id: int("id").autoincrement().primaryKey(),
    identifierHash: varchar("identifier_hash", { length: 64 }).notNull(),
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
    success: boolean("success").notNull().default(false),
    attemptedAt: timestamp("attempted_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_login_identifier_time").on(t.identifierHash, t.attemptedAt),
    index("idx_login_ip_time").on(t.ipHash, t.attemptedAt),
  ],
);

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    actorId: int("actor_id").references(() => users.id),
    action: varchar("action", { length: 64 }).notNull(),
    resourceType: varchar("resource_type", { length: 64 }).notNull(),
    resourceId: varchar("resource_id", { length: 128 }),
    subjectUserId: int("subject_user_id").references(() => users.id),
    ipHash: varchar("ip_hash", { length: 64 }),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_audit_actor_time").on(t.actorId, t.createdAt),
    index("idx_audit_subject_time").on(t.subjectUserId, t.createdAt),
  ],
);

export const privacyConsents = mysqlTable(
  "privacy_consents",
  {
    userId: int("user_id").primaryKey().references(() => users.id),
    policyVersion: varchar("policy_version", { length: 32 }).notNull(),
    acceptedAt: timestamp("accepted_at").notNull().defaultNow(),
    withdrawnAt: timestamp("withdrawn_at"),
  },
);

export const privacyRequests = mysqlTable(
  "privacy_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().references(() => users.id),
    requestType: mysqlEnum("request_type", ["EXPORT", "DELETE"]).notNull(),
    status: mysqlEnum("status", ["PENDING", "COMPLETED", "REJECTED"]).notNull().default("PENDING"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (t) => [index("idx_privacy_request_user_time").on(t.userId, t.createdAt)],
);

/* ---------------- Site settings (ตั้งค่าเว็บ/SEO) — แถวเดียว id=1 ---------------- */
export const siteSettings = mysqlTable("site_settings", {
  id: int("id").primaryKey(),
  siteName: varchar("site_name", { length: 128 }).notNull().default("Trainner"),
  metaTitle: varchar("meta_title", { length: 191 })
    .notNull()
    .default("Trainner — ระบบจัดการลูกเทรน"),
  metaDescription: varchar("meta_description", { length: 300 })
    .notNull()
    .default("ระบบสำหรับเทรนเนอร์จัดการลูกเทรนของตัวเอง"),
  keywords: varchar("keywords", { length: 300 }),
  contactEmail: varchar("contact_email", { length: 128 }),
  // ป็อปอัพประกาศ (โชว์ให้เทรนเนอร์/ลูกเทรนตอนล็อกอิน)
  popupEnabled: boolean("popup_enabled").notNull().default(false),
  popupImagePath: varchar("popup_image_path", { length: 255 }),
  popupTitle: varchar("popup_title", { length: 191 }),
  popupLinkUrl: varchar("popup_link_url", { length: 500 }),
  // เปิด/ปิดระบบแชทเทรนเนอร์-ลูกเทรนทั้งเว็บ
  chatEnabled: boolean("chat_enabled").notNull().default(true),
  // เปิด/ปิดระบบแต้มสะสม/badge/leaderboard ทั้งเว็บ + ค่าแต้มที่ปรับได้
  gamificationEnabled: boolean("gamification_enabled").notNull().default(true),
  pointsTrainingCompleted: int("points_training_completed").notNull().default(10),
  pointsFoodLogged: int("points_food_logged").notNull().default(2),
  pointsBadgeBonus: int("points_badge_bonus").notNull().default(20),
  // ค่าดำเนินงานที่เดิมฝังเป็นค่าคงที่ในโค้ด — ย้ายมาให้เจ้าของระบบปรับได้จากหลังบ้าน
  bookingCancelWindowHours: int("booking_cancel_window_hours").notNull().default(6),
  sessionDurationMin: int("session_duration_min").notNull().default(60),
  chatMaxMessageLength: int("chat_max_message_length").notNull().default(2000),
  chatDeleteWindowMin: int("chat_delete_window_min").notNull().default(5),
  maxUploadSizeMb: int("max_upload_size_mb").notNull().default(10),
  // ธีมหน้า login — เรียบง่าย / แบ่งครึ่งจอ+มือถือ / กรอบมือถือลอย (เลือกได้จากหลังบ้าน)
  loginTheme: mysqlEnum("login_theme", ["simple", "split", "frame"]).notNull().default("simple"),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

/* ---------------- Relations ---------------- */
export const usersRelations = relations(users, ({ one, many }) => ({
  trainer: one(users, {
    fields: [users.trainerId],
    references: [users.id],
    relationName: "trainerClients",
  }),
  clients: many(users, { relationName: "trainerClients" }),
  profile: one(clientProfiles, {
    fields: [users.id],
    references: [clientProfiles.userId],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ClientProfile = typeof clientProfiles.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Role = User["role"];
export type SiteSettings = typeof siteSettings.$inferSelect;
export type CalculatorResult = typeof calculatorResults.$inferSelect;
