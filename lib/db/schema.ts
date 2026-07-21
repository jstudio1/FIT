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
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

/* ---------------- Trainer settings (เปิด/ปิดรับจอง) ---------------- */
export const trainerSettings = mysqlTable("trainer_settings", {
  trainerId: int("trainer_id")
    .primaryKey()
    .references(() => users.id),
  bookingOpen: boolean("booking_open").notNull().default(true),
  openHour: int("open_hour").notNull().default(8),
  closeHour: int("close_hour").notNull().default(20),
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
