import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  users,
  clientProfiles,
  bookings,
  foodLogs,
  foodComments,
  sessionResults,
  notifications,
} from "../lib/db/schema";
import { hashPassword } from "../lib/password";
import { saveFoodImage } from "../lib/upload";
import { getWeekDays } from "../lib/schedule";

const CLIENTS = [
  { u: "demo1", name: "มานะ ตั้งใจ" },
  { u: "demo2", name: "ปิติ ยินดี" },
  { u: "demo3", name: "ชูใจ แจ่มใส" },
  { u: "demo4", name: "วีระ กล้าหาญ" },
  { u: "demo5", name: "สมหญิง ทองดี" },
  { u: "demo6", name: "อรุณ สว่างแสง" },
  { u: "demo7", name: "กานดา ศรีสุข" },
  { u: "demo8", name: "ธนา มั่งมี" },
  { u: "demo9", name: "นภา ฟ้าใส" },
  { u: "demo10", name: "ศิริ พรหมมา" },
  { u: "demo11", name: "พงษ์ เพียรทำ" },
];

const GOALS = [
  "ลดน้ำหนัก 5 กก. ใน 3 เดือน",
  "เพิ่มกล้ามเนื้อ ลดไขมัน",
  "ฟิตหุ่นก่อนแต่งงาน",
  "ลดพุง เพิ่มความแข็งแรง",
  "วิ่งมาราธอน 10 กม.",
  "สุขภาพดี ลดความเครียด",
];
const ALCOHOL = ["ไม่ดื่ม", "สัปดาห์ละครั้ง", "เดือนละครั้ง", "สังสรรค์บ้าง"];
const SLEEP = ["นอน 7-8 ชม.", "นอนดึก 5-6 ชม.", "นอนไม่ค่อยหลับ"];
const WORK = ["นั่งออฟฟิศ", "งานยืนทั้งวัน", "ทำงานกะกลางคืน"];

// สีสำหรับ "จานอาหาร" ตัวอย่าง
const FOOD_COLORS = [
  ["#e07a5f", "#81b29a", "#f2cc8f"],
  ["#c1502e", "#6a994e", "#e9c46a"],
  ["#d62828", "#588157", "#f4a261"],
  ["#bc6c25", "#606c38", "#dda15e"],
  ["#e76f51", "#2a9d8f", "#e9c46a"],
];
const MEALS = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;
const NOTES = [
  "ข้าวกล้อง + อกไก่ย่าง + ผัก",
  "สลัดอกไก่ น้ำสลัดใส",
  "ข้าวผัดกะเพราไก่ ไข่ดาว",
  "โปรตีนเชค + กล้วย",
  "ต้มยำกุ้ง ข้าวสวย",
  "โจ๊กหมู ไข่ลวก",
];

function plateSvg(colors: string[]): Buffer {
  const [a, b, c] = colors;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450">
      <rect width="600" height="450" fill="#f4efe7"/>
      <circle cx="300" cy="225" r="175" fill="#ffffff" stroke="#e5ddd0" stroke-width="6"/>
      <circle cx="250" cy="195" r="78" fill="${a}"/>
      <circle cx="360" cy="205" r="66" fill="${b}"/>
      <circle cx="300" cy="300" r="58" fill="${c}"/>
      <circle cx="230" cy="285" r="34" fill="${b}"/>
    </svg>`,
  );
}

async function main() {
  const [trainer] = await db
    .select()
    .from(users)
    .where(eq(users.username, "somchai"))
    .limit(1);
  if (!trainer) {
    console.error("❌ ไม่พบเทรนเนอร์ 'somchai' — สร้างบัญชีเทรนเนอร์ก่อน");
    process.exit(1);
  }

  const pw = await hashPassword("client123");
  const days = getWeekDays(new Date()); // จ.–อา. ของสัปดาห์นี้

  const newClientIds: number[] = [];
  let created = 0;

  for (let i = 0; i < CLIENTS.length; i++) {
    const c = CLIENTS[i];
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.username, c.u))
      .limit(1);
    if (existing) {
      console.log(`  • ${c.u} มีอยู่แล้ว — ข้าม`);
      continue;
    }
    const ins = await db
      .insert(users)
      .values({
        username: c.u,
        passwordHash: pw,
        role: "CLIENT",
        fullName: c.name,
        trainerId: trainer.id,
      })
      .$returningId();
    const id = ins[0].id;

    await db.insert(clientProfiles).values({
      userId: id,
      goals: GOALS[i % GOALS.length],
      healthHistory: i % 3 === 0 ? "ปวดเข่าเล็กน้อย" : "ไม่มีโรคประจำตัว",
      startWeight: 62 + i * 2.5,
      startHeight: 160 + (i % 5) * 4,
      startWaist: 78 + i * 1.5,
      startMuscleMass: 26 + (i % 4),
      startBodyFat: 20 + (i % 6),
      exerciseBackground: i % 2 === 0 ? "เคยออกกำลังกายบ้าง" : "มือใหม่",
      sleepPattern: SLEEP[i % SLEEP.length],
      workPattern: WORK[i % WORK.length],
      daysPerWeek: 2 + (i % 4),
      mealsPerDay: 2 + (i % 3),
      alcoholFrequency: ALCOHOL[i % ALCOHOL.length],
      disciplineNote: i % 2 === 0 ? "สม่ำเสมอ" : "ขาดบ้างบางครั้ง",
    });

    newClientIds.push(id);
    created++;
  }

  console.log(`✅ สร้างลูกเทรนใหม่ ${created} คน`);

  if (newClientIds.length === 0) {
    console.log("ℹ️ ไม่มีลูกเทรนใหม่ — ข้ามการสร้างนัด/อาหาร/ผลลัพธ์");
    process.exit(0);
  }

  /* ---------------- Bookings ---------------- */
  // สร้างช่องเวลาที่ไม่ซ้ำ (วันพรุ่งนี้เป็นต้นไป) + 2 นัดที่ผ่านมาแล้ววันนี้
  const futureSlots: { date: string; hour: number }[] = [];
  for (let d = 1; d < 7; d++) {
    for (const h of [9, 11, 13, 15, 17]) {
      futureSlots.push({ date: days[d].dateStr, hour: h });
    }
  }

  let bookingCount = 0;
  // 2 นัดที่ผ่านมาแล้ว (วันนี้ 08:00, 09:00) → COMPLETED / NO_SHOW
  const pastAssign: {
    clientId: number;
    hour: number;
    status: "COMPLETED" | "NO_SHOW";
  }[] = [
    { clientId: newClientIds[0], hour: 8, status: "COMPLETED" },
    { clientId: newClientIds[1] ?? newClientIds[0], hour: 9, status: "NO_SHOW" },
  ];
  for (const p of pastAssign) {
    try {
      await db.insert(bookings).values({
        clientId: p.clientId,
        trainerId: trainer.id,
        date: days[0].dateStr,
        hour: p.hour,
        status: p.status,
      });
      bookingCount++;
    } catch {
      /* slot ซ้ำ — ข้าม */
    }
  }

  // นัดในอนาคต 1-2 นัดต่อคน
  let slotIdx = 0;
  for (let i = 0; i < newClientIds.length && slotIdx < futureSlots.length; i++) {
    const nBookings = i % 3 === 0 ? 2 : 1;
    for (let b = 0; b < nBookings && slotIdx < futureSlots.length; b++) {
      const slot = futureSlots[slotIdx++];
      try {
        await db.insert(bookings).values({
          clientId: newClientIds[i],
          trainerId: trainer.id,
          date: slot.date,
          hour: slot.hour,
          status: "BOOKED",
        });
        bookingCount++;
        await db.insert(notifications).values({
          userId: trainer.id,
          type: "booking",
          title: "มีการจองใหม่",
          message: `${CLIENTS[i].name} จองวันที่ ${slot.date} เวลา ${String(slot.hour).padStart(2, "0")}:00`,
        });
      } catch {
        /* ข้าม */
      }
    }
  }
  console.log(`✅ สร้างการจอง ${bookingCount} รายการ`);

  /* ---------------- Food logs + comments ---------------- */
  let foodCount = 0;
  const foodClients = newClientIds.slice(0, 6);
  for (let i = 0; i < foodClients.length; i++) {
    const clientId = foodClients[i];
    const nMeals = (i % 2) + 1;
    for (let m = 0; m < nMeals; m++) {
      const imgBuf = plateSvg(FOOD_COLORS[(i + m) % FOOD_COLORS.length]);
      const imagePath = await saveFoodImage(imgBuf);
      const insLog = await db
        .insert(foodLogs)
        .values({
          clientId,
          imagePath,
          mealType: MEALS[(i + m) % MEALS.length],
          note: NOTES[(i + m) % NOTES.length],
        })
        .$returningId();
      foodCount++;

      // ตรวจ/คอมเมนต์บางรายการ (คนคู่)
      if (i % 2 === 0) {
        await db.insert(foodComments).values({
          foodLogId: insLog[0].id,
          trainerId: trainer.id,
          comment: "มื้อนี้โอเค คุมโปรตีนได้ดี ลดแป้งลงอีกนิด",
          calories: 400 + i * 40,
        });
        await db.insert(notifications).values({
          userId: clientId,
          type: "food",
          title: "เทรนเนอร์ตรวจอาหารแล้ว",
          message: `เทรนเนอร์คอมเมนต์อาหารของคุณ (~${400 + i * 40} แคล)`,
        });
      } else {
        await db.insert(notifications).values({
          userId: trainer.id,
          type: "food",
          title: "ลูกเทรนส่งรูปอาหาร",
          message: `${CLIENTS[i].name} ส่งรูปอาหารมื้อใหม่ให้ตรวจ`,
        });
      }
    }
  }
  console.log(`✅ สร้างรายการอาหาร ${foodCount} รายการ (พร้อมรูปตัวอย่าง)`);

  /* ---------------- Session results (กราฟ) ---------------- */
  let resultCount = 0;
  const resultClients = newClientIds.slice(0, 5);
  for (let i = 0; i < resultClients.length; i++) {
    const clientId = resultClients[i];
    const baseW = 64 + i * 3;
    const baseWaist = 82 + i * 2;
    const dates = ["2026-07-06", "2026-07-13", "2026-07-20"];
    for (let d = 0; d < dates.length; d++) {
      await db.insert(sessionResults).values({
        clientId,
        weight: baseW - d * 0.8,
        waist: baseWaist - d * 1.2,
        muscleMass: 27 + i * 0.5 + d * 0.3,
        bodyFat: 24 + i - d * 0.7,
        phase: "POST",
        note: d === dates.length - 1 ? "ดีขึ้นเรื่อยๆ" : null,
        measuredAt: new Date(`${dates[d]}T12:00:00`),
      });
      resultCount++;
    }
  }
  console.log(`✅ สร้างผลลัพธ์ ${resultCount} รายการ (สำหรับกราฟ)`);

  console.log("\n🎉 seed demo เสร็จสิ้น — ล็อกอินเทรนเนอร์ somchai/trainer123 เพื่อดู");
  console.log("   ลูกเทรนทุกคนรหัสผ่าน: client123 (เช่น demo1, demo2, ...)");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ seed-demo ล้มเหลว:", e);
  process.exit(1);
});
