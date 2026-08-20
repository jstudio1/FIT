import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { menuItems } from "../lib/db/schema";
import { saveMenuImage } from "../lib/upload";
import { searchPexelsPhotos, downloadFirstWorkingPhoto } from "../lib/pexels";

/**
 * โหลดคลังเมนูอาหารแนะนำ (คลีน/แคลน้อย) พร้อมรูปจาก Pexels เข้าฐานข้อมูล
 * รันซ้ำได้เสมอ (idempotent):
 *   - ชื่อเมนูที่ยังไม่มี → เพิ่มใหม่ + ดาวน์โหลดรูป
 *   - ชื่อเมนูที่มีอยู่แล้ว → อัปเดตข้อมูล (คำอธิบาย/ส่วนประกอบ/โภชนาการ/แท็ก) แต่ไม่ดาวน์โหลดรูปซ้ำ
 *   npm run seed:menu
 * ต้องตั้งค่า PEXELS_API_KEY ใน .env ก่อน (สมัครฟรีที่ pexels.com/api)
 */

type SeedMenu = {
  name: string;
  description: string;
  ingredients: string[]; // ส่วนประกอบหลัก สูงสุด 6 รายการ (ใช้ในไดอะแกรมหน้ารายละเอียดเมนู)
  calories: number;
  protein: number;
  carb: number;
  fat: number;
  tagClean: boolean;
  tagLowCal: boolean;
  tagDessert: boolean; // ขนม/ของหวานเพื่อสุขภาพ
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK" | "ANY";
  imageQuery: string; // คำค้นภาษาอังกฤษสำหรับหารูปใน Pexels
};

const MENUS: SeedMenu[] = [
  { name: "อกไก่ย่างสมุนไพร สลัดผัก", description: "อกไก่ย่างหมักสมุนไพร เสิร์ฟกับสลัดผักรวมน้ำสลัดใส", ingredients: ["อกไก่ 150 กรัม", "ผักสลัดรวม", "มะเขือเทศเชอร์รี่", "แตงกวา", "น้ำสลัดใส", "สมุนไพรหมัก"], calories: 320, protein: 38, carb: 12, fat: 10, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "LUNCH", imageQuery: "grilled chicken breast salad" },
  { name: "ข้าวกล้องผัดกะเพราไก่ไข่ดาว (น้ำมันน้อย)", description: "ผัดกะเพราไก่สับสูตรน้ำมันน้อย เสิร์ฟกับข้าวกล้องและไข่ดาว", ingredients: ["ไก่สับ 120 กรัม", "ใบกะเพรา", "ข้าวกล้อง 1 ทัพพี", "ไข่ดาว 1 ฟอง", "พริก/กระเทียม", "ซอสปรุงรส"], calories: 480, protein: 32, carb: 55, fat: 14, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "LUNCH", imageQuery: "thai basil chicken rice" },
  { name: "ต้มยำกุ้งน้ำใส", description: "ต้มยำกุ้งสูตรน้ำใส เผ็ดเปรี้ยวจัดจ้าน ไม่ใส่นม", ingredients: ["กุ้ง 100 กรัม", "ตะไคร้", "ใบมะกรูด", "ข่า", "พริกขี้หนู", "น้ำมะนาว"], calories: 180, protein: 20, carb: 10, fat: 5, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "DINNER", imageQuery: "tom yum soup shrimp" },
  { name: "ยำวุ้นเส้นทะเล", description: "ยำวุ้นเส้นรวมมิตรทะเล กุ้ง หมึก เผ็ดเปรี้ยว", ingredients: ["วุ้นเส้น", "กุ้งสด", "หมึกสด", "หอมใหญ่", "คื่นฉ่าย", "น้ำยำรสจัด"], calories: 250, protein: 18, carb: 28, fat: 6, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "DINNER", imageQuery: "thai glass noodle salad seafood" },
  { name: "ข้าวโอ๊ตต้มนมอัลมอนด์ กล้วย", description: "ข้าวโอ๊ตต้มกับนมอัลมอนด์ ใส่กล้วยหั่นและอบเชย", ingredients: ["ข้าวโอ๊ต 50 กรัม", "นมอัลมอนด์", "กล้วยหอม", "อบเชย", "น้ำผึ้งเล็กน้อย"], calories: 300, protein: 10, carb: 55, fat: 6, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "BREAKFAST", imageQuery: "oatmeal banana bowl" },
  { name: "ไข่ต้ม อะโวคาโดโทสต์โฮลวีท", description: "ไข่ต้ม 2 ฟอง คู่ขนมปังโฮลวีททาอะโวคาโด", ingredients: ["ไข่ต้ม 2 ฟอง", "ขนมปังโฮลวีท", "อะโวคาโด", "มะนาว", "เกลือ/พริกไทย"], calories: 340, protein: 16, carb: 30, fat: 18, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "BREAKFAST", imageQuery: "avocado toast" },
  { name: "สลัดทูน่าไข่ต้ม", description: "ทูน่าในน้ำแร่ ไข่ต้ม ผักสลัดรวม น้ำสลัดใส", ingredients: ["ทูน่าในน้ำแร่", "ไข่ต้ม", "ผักสลัดรวม", "มะเขือเทศ", "น้ำสลัดใส"], calories: 280, protein: 26, carb: 12, fat: 14, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "LUNCH", imageQuery: "tuna salad bowl" },
  { name: "แซลมอนย่างซอสเทอริยากิ บร็อคโคลี่นึ่ง", description: "แซลมอนย่างราดซอสเทอริยากิ เสิร์ฟกับบร็อคโคลี่นึ่ง", ingredients: ["แซลมอน 150 กรัม", "ซอสเทอริยากิ", "บร็อคโคลี่นึ่ง", "งาขาว", "ข้าวสวย"], calories: 420, protein: 34, carb: 20, fat: 20, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "DINNER", imageQuery: "grilled salmon broccoli" },
  { name: "สลัดอกไก่ควินัว", description: "อกไก่ย่างหั่นชิ้น ควินัวต้ม ผักสลัดรวม", ingredients: ["อกไก่ย่าง", "ควินัวต้ม", "ผักสลัดรวม", "มะเขือเทศเชอร์รี่", "น้ำสลัดมะนาว"], calories: 380, protein: 30, carb: 35, fat: 12, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "LUNCH", imageQuery: "quinoa chicken salad bowl" },
  { name: "ข้าวผัดไข่ขาวใส่ผัก สูตรแคลต่ำ", description: "ข้าวผัดไข่ขาว ใส่ผักรวม ปรุงรสน้ำมันน้อย", ingredients: ["ไข่ขาว 3 ฟอง", "ข้าวสวย", "แครอท", "ถั่วลันเตา", "ต้นหอม", "ซีอิ๊วขาว"], calories: 300, protein: 14, carb: 45, fat: 6, tagClean: false, tagLowCal: true, tagDessert: false, mealType: "LUNCH", imageQuery: "egg fried rice vegetables" },
  { name: "ส้มตำไทย (ไม่ใส่น้ำตาลปี๊บ)", description: "ส้มตำไทยรสจัดจ้าน สูตรลดหวาน ไม่ใส่น้ำตาลปี๊บ", ingredients: ["มะละกอสับ", "มะเขือเทศ", "ถั่วฝักยาว", "กระเทียม/พริก", "มะนาว", "น้ำปลา"], calories: 120, protein: 4, carb: 22, fat: 2, tagClean: false, tagLowCal: true, tagDessert: false, mealType: "SNACK", imageQuery: "som tam papaya salad" },
  { name: "แกงจืดเต้าหู้หมูสับ", description: "แกงจืดเต้าหู้อ่อนหมูสับ ใส่ผักกาดขาว", ingredients: ["เต้าหู้อ่อน", "หมูสับ", "ผักกาดขาว", "กระเทียม", "ต้นหอม/ผักชี"], calories: 220, protein: 18, carb: 10, fat: 10, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "DINNER", imageQuery: "tofu clear soup" },
  { name: "ปลานึ่งมะนาว ข้าวกล้อง", description: "ปลากะพงนึ่งมะนาว รสเปรี้ยวเผ็ด เสิร์ฟกับข้าวกล้อง", ingredients: ["ปลากะพง", "มะนาว", "กระเทียม/พริก", "ผักชี", "ข้าวกล้อง"], calories: 380, protein: 32, carb: 40, fat: 8, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "DINNER", imageQuery: "steamed fish lime sauce" },
  { name: "โยเกิร์ตกรีก เบอร์รี่ กราโนล่า", description: "โยเกิร์ตกรีกไขมันต่ำ ใส่เบอร์รี่รวมและกราโนล่า", ingredients: ["โยเกิร์ตกรีก", "บลูเบอร์รี่", "สตรอว์เบอร์รี่", "กราโนล่า", "น้ำผึ้ง"], calories: 230, protein: 15, carb: 30, fat: 6, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "BREAKFAST", imageQuery: "greek yogurt berries granola" },
  { name: "สมูทตี้โบวล์ผลไม้รวม", description: "สมูทตี้โบวล์ปั่นจากผลไม้รวม โรยหน้าด้วยธัญพืช", ingredients: ["กล้วยแช่แข็ง", "เบอร์รี่รวม", "นมอัลมอนด์", "เมล็ดเจีย", "กราโนล่า"], calories: 310, protein: 8, carb: 55, fat: 8, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "BREAKFAST", imageQuery: "smoothie bowl fruit" },
  { name: "ไก่อบสมุนไพร มันหวานอบ", description: "อกไก่อบสมุนไพรทั้งชิ้น เสิร์ฟกับมันหวานอบ", ingredients: ["อกไก่ทั้งชิ้น", "โรสแมรี่/ไทม์", "มันหวาน", "น้ำมันมะกอก", "กระเทียม"], calories: 400, protein: 35, carb: 35, fat: 12, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "DINNER", imageQuery: "roasted chicken sweet potato" },
  { name: "สลัดผักรวมน้ำสลัดงา", description: "ผักสลัดรวมสด ราดน้ำสลัดงาแคลต่ำ", ingredients: ["ผักสลัดรวม", "แครอทเส้น", "ข้าวโพดอ่อน", "น้ำสลัดงา", "งาคั่ว"], calories: 150, protein: 5, carb: 15, fat: 8, tagClean: false, tagLowCal: true, tagDessert: false, mealType: "SNACK", imageQuery: "mixed greens salad sesame dressing" },
  { name: "ข้าวต้มปลา", description: "ข้าวต้มปลากะพง ใส่ขิงและต้นหอม", ingredients: ["ปลากะพง", "ข้าวสวย", "ขิงซอย", "ต้นหอม/ผักชี", "ซีอิ๊วขาว"], calories: 250, protein: 20, carb: 30, fat: 5, tagClean: false, tagLowCal: true, tagDessert: false, mealType: "BREAKFAST", imageQuery: "fish rice porridge" },
  { name: "อกไก่นึ่งงาดำ ผักลวก", description: "อกไก่นึ่งโรยงาดำ เสิร์ฟกับผักลวกรวม", ingredients: ["อกไก่นึ่ง", "งาดำ", "บร็อคโคลี่ลวก", "แครอทลวก", "ซอสงา"], calories: 260, protein: 30, carb: 15, fat: 8, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "LUNCH", imageQuery: "steamed chicken breast vegetables" },
  { name: "ซุปฟักทองนมอัลมอนด์", description: "ซุปฟักทองบดเนียน ผสมนมอัลมอนด์ ไม่ใส่ครีม", ingredients: ["ฟักทอง", "นมอัลมอนด์", "หอมใหญ่", "เกลือ/พริกไทย"], calories: 160, protein: 5, carb: 25, fat: 5, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "SNACK", imageQuery: "pumpkin soup bowl" },
  { name: "กุ้งอบเนย หน่อไม้ฝรั่ง", description: "กุ้งแม่น้ำอบเนยกระเทียม เสิร์ฟกับหน่อไม้ฝรั่ง", ingredients: ["กุ้งแม่น้ำ", "เนย", "กระเทียม", "หน่อไม้ฝรั่ง", "มะนาว"], calories: 340, protein: 28, carb: 10, fat: 20, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "DINNER", imageQuery: "grilled shrimp asparagus" },
  { name: "ข้าวไข่เจียวไข่ขาว น้ำมันน้อย", description: "ไข่เจียวไข่ขาวทอดน้ำมันน้อย เสิร์ฟกับข้าวสวย", ingredients: ["ไข่ขาว 3 ฟอง", "ข้าวสวย", "ต้นหอม", "ซอสพริก"], calories: 280, protein: 16, carb: 40, fat: 6, tagClean: false, tagLowCal: true, tagDessert: false, mealType: "LUNCH", imageQuery: "egg white omelette rice" },
  { name: "สลัดผลไม้รวม ไม่ใส่น้ำเชื่อม", description: "ผลไม้รวมตามฤดูกาล หั่นพร้อมทาน ไม่ใส่น้ำเชื่อม", ingredients: ["แอปเปิล", "องุ่น", "แคนตาลูป", "สับปะรด", "มะนาว"], calories: 140, protein: 2, carb: 34, fat: 1, tagClean: false, tagLowCal: true, tagDessert: false, mealType: "SNACK", imageQuery: "fresh fruit salad bowl" },
  { name: "อกไก่ย่างซอสพริกไทยดำ ข้าวกล้อง", description: "อกไก่ย่างราดซอสพริกไทยดำ เสิร์ฟกับข้าวกล้อง", ingredients: ["อกไก่ย่าง", "ซอสพริกไทยดำ", "ข้าวกล้อง", "บร็อคโคลี่"], calories: 420, protein: 36, carb: 40, fat: 10, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "LUNCH", imageQuery: "grilled chicken black pepper sauce rice" },
  { name: "แกงเลียงผักรวม", description: "แกงเลียงผักรวมรสเผ็ดร้อน ใส่กุ้งแห้ง", ingredients: ["ฟักทอง", "บวบ", "ตำลึง", "กุ้งแห้ง", "พริกไทย/หอมแดง"], calories: 180, protein: 10, carb: 18, fat: 6, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "DINNER", imageQuery: "thai vegetable soup" },
  { name: "เต้าหู้ผัดผักรวม น้ำมันน้อย", description: "เต้าหู้ทอดน้ำมันน้อยผัดกับผักรวม", ingredients: ["เต้าหู้แข็ง", "แครอท", "ถั่วลันเตา", "ข้าวโพดอ่อน", "ซอสหอยนางรม"], calories: 240, protein: 14, carb: 20, fat: 10, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "DINNER", imageQuery: "tofu stir fry vegetables" },
  { name: "ไข่ตุ๋นทรงเครื่อง", description: "ไข่ตุ๋นนุ่มใส่หมูสับและต้นหอม", ingredients: ["ไข่ไก่ 2 ฟอง", "หมูสับ", "เห็ดหอม", "ต้นหอม", "ซีอิ๊วขาว"], calories: 200, protein: 14, carb: 8, fat: 12, tagClean: false, tagLowCal: true, tagDessert: false, mealType: "DINNER", imageQuery: "steamed egg custard" },
  { name: "น้ำเต้าหู้ไม่หวาน ธัญพืช", description: "น้ำเต้าหู้สูตรไม่หวาน โรยหน้าด้วยธัญพืชรวม", ingredients: ["น้ำเต้าหู้", "ข้าวโอ๊ต", "เมล็ดฟักทอง", "อัลมอนด์สไลซ์"], calories: 150, protein: 8, carb: 20, fat: 4, tagClean: false, tagLowCal: true, tagDessert: false, mealType: "BREAKFAST", imageQuery: "soy milk grains breakfast" },
  { name: "สเต็กแซลมอนซอสมะนาว", description: "สเต็กแซลมอนย่าง ราดซอสมะนาวเนย", ingredients: ["แซลมอนสเต็ก", "เนย", "มะนาว", "กระเทียม", "ผักโขม"], calories: 400, protein: 32, carb: 15, fat: 22, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "DINNER", imageQuery: "salmon steak lemon sauce" },
  { name: "ข้าวกล้องผัดผักรวมเต้าหู้", description: "ข้าวกล้องผัดผักรวมใส่เต้าหู้ น้ำมันน้อย", ingredients: ["ข้าวกล้อง", "เต้าหู้", "แครอท", "ถั่วลันเตา", "ซีอิ๊วขาว"], calories: 320, protein: 15, carb: 45, fat: 8, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "LUNCH", imageQuery: "brown rice vegetable stir fry" },
  { name: "ไก่ต้มขมิ้น น้ำจิ้มแจ่ว", description: "ไก่ต้มขมิ้นทั้งตัว หั่นเสิร์ฟกับน้ำจิ้มแจ่วรสแซ่บ", ingredients: ["ไก่ทั้งตัว", "ขมิ้นสด", "ตะไคร้", "น้ำจิ้มแจ่ว", "ผักแนม"], calories: 260, protein: 32, carb: 8, fat: 10, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "LUNCH", imageQuery: "turmeric boiled chicken thai" },
  { name: "เมี่ยงคำ แคลต่ำ", description: "เมี่ยงคำห่อใบชะพลู รสจัดจ้าน ของว่างแคลต่ำ", ingredients: ["ใบชะพลู", "มะพร้าวคั่ว", "ถั่วลิสง", "ขิงซอย", "มะนาว", "น้ำเมี่ยงคำ"], calories: 130, protein: 5, carb: 15, fat: 5, tagClean: false, tagLowCal: true, tagDessert: false, mealType: "SNACK", imageQuery: "thai miang kham appetizer" },

  // ชุดที่ 2 — เพิ่มความหลากหลาย (ก๋วยเตี๋ยว, อาหารญี่ปุ่น/เวียดนามแนวคลีน, ของว่างแคลต่ำ)
  { name: "ผัดไทยกุ้งสด น้ำมันน้อย", description: "ผัดไทยเส้นจันท์สูตรน้ำมันน้อย ใส่กุ้งสด ถั่วงอก", ingredients: ["เส้นจันท์", "กุ้งสด", "ถั่วงอก", "ไข่", "ถั่วลิสงป่น", "มะนาว"], calories: 420, protein: 24, carb: 55, fat: 12, tagClean: false, tagLowCal: true, tagDessert: false, mealType: "LUNCH", imageQuery: "pad thai shrimp noodles" },
  { name: "ก๋วยเตี๋ยวต้มยำน้ำใส", description: "ก๋วยเตี๋ยวหมูต้มยำน้ำใส รสเปรี้ยวเผ็ดจัดจ้าน", ingredients: ["เส้นก๋วยเตี๋ยว", "หมูสไลซ์", "ตะไคร้/ใบมะกรูด", "พริกป่น", "น้ำมะนาว"], calories: 280, protein: 15, carb: 40, fat: 6, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "LUNCH", imageQuery: "tom yum noodle soup" },
  { name: "ข้าวมันไก่ต้ม (ไม่ใส่หนัง)", description: "ข้าวมันไก่ต้มแบบลอกหนังออก น้ำจิ้มแจ่วพริกขิง", ingredients: ["ไก่ต้ม (ไม่มีหนัง)", "ข้าวหุงน้ำมันไก่", "ขิง/กระเทียม", "น้ำจิ้มแจ่ว", "แตงกวา"], calories: 450, protein: 30, carb: 55, fat: 10, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "LUNCH", imageQuery: "hainanese chicken rice" },
  { name: "แกงส้มผักรวมกุ้ง", description: "แกงส้มรสจัดจ้าน ใส่ผักรวมและกุ้งสด", ingredients: ["กุ้งสด", "มะละกอ/ผักกาดขาว", "พริกแกงส้ม", "มะขามเปียก", "น้ำปลา"], calories: 200, protein: 16, carb: 18, fat: 5, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "DINNER", imageQuery: "thai sour curry soup vegetables" },
  { name: "แกงเขียวหวานไก่ กะทิน้อย", description: "แกงเขียวหวานไก่สูตรลดกะทิ ใส่มะเขือพวง", ingredients: ["ไก่", "พริกแกงเขียวหวาน", "กะทิ (น้อย)", "มะเขือพวง", "ใบโหระพา"], calories: 380, protein: 28, carb: 20, fat: 20, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "DINNER", imageQuery: "green curry chicken" },
  { name: "ลาบไก่", description: "ลาบไก่สับรสแซ่บ ใส่ข้าวคั่วและสะระแหน่", ingredients: ["ไก่สับ", "ข้าวคั่ว", "พริกป่น", "หอมแดง", "สะระแหน่", "มะนาว"], calories: 260, protein: 28, carb: 10, fat: 10, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "DINNER", imageQuery: "larb chicken salad thai" },
  { name: "น้ำตกหมู", description: "หมูย่างสไลซ์คลุกน้ำตก รสเปรี้ยวเผ็ดจัดจ้าน", ingredients: ["หมูย่าง", "ข้าวคั่ว", "พริกป่น", "หอมแดง", "ผักชีฝรั่ง", "มะนาว"], calories: 280, protein: 26, carb: 8, fat: 14, tagClean: false, tagLowCal: true, tagDessert: false, mealType: "DINNER", imageQuery: "thai grilled pork salad namtok" },
  { name: "หมูย่างซอสมะขาม ข้าวกล้อง", description: "หมูย่างราดซอสมะขามเปียก เสิร์ฟกับข้าวกล้อง", ingredients: ["หมูสันคอ", "ซอสมะขามเปียก", "ข้าวกล้อง", "ผักสด"], calories: 400, protein: 30, carb: 40, fat: 12, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "LUNCH", imageQuery: "grilled pork tamarind sauce" },
  { name: "ปลาทูทอด น้ำพริกผักลวก", description: "ปลาทูทอดคู่น้ำพริกกะปิและผักลวกรวม", ingredients: ["ปลาทู", "น้ำพริกกะปิ", "ผักลวกรวม", "มะเขือ", "แตงกวา"], calories: 320, protein: 24, carb: 20, fat: 16, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "LUNCH", imageQuery: "fried mackerel thai chili paste" },
  { name: "ข้าวคลุกกะปิ", description: "ข้าวคลุกกะปิรสเข้มข้น เสิร์ฟกับไข่เจียวและหมูหวาน", ingredients: ["กะปิ", "ข้าวสวย", "หมูหวาน", "ไข่เจียวซอย", "ถั่วฝักยาว", "มะม่วงเปรี้ยว"], calories: 380, protein: 18, carb: 50, fat: 12, tagClean: false, tagLowCal: false, tagDessert: false, mealType: "LUNCH", imageQuery: "thai shrimp paste fried rice" },
  { name: "ข้าวผัดแซลมอนคลีน", description: "ข้าวผัดแซลมอนสูตรคลีน ใส่ผักรวมน้ำมันน้อย", ingredients: ["แซลมอน", "ข้าวกล้อง", "ไข่", "ต้นหอม", "ซีอิ๊วขาว"], calories: 420, protein: 26, carb: 48, fat: 14, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "LUNCH", imageQuery: "salmon fried rice" },
  { name: "สลัดโรลเวียดนามกุ้ง", description: "สลัดโรลเวียดนามสด ใส่กุ้งและวุ้นเส้น จิ้มน้ำจิ้มถั่ว", ingredients: ["แผ่นเปาะเปี๊ยะ", "กุ้งลวก", "วุ้นเส้น", "ผักสด/สะระแหน่", "น้ำจิ้มถั่ว"], calories: 180, protein: 12, carb: 28, fat: 2, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "SNACK", imageQuery: "vietnamese spring rolls shrimp" },
  { name: "เกี๊ยวซ่าไก่นึ่ง", description: "เกี๊ยวซ่าไก่สับนึ่ง เสิร์ฟกับน้ำจิ้มซีอิ๊ว", ingredients: ["ไก่สับ", "แป้งเกี๊ยว", "กะหล่ำปลี", "ขิง", "น้ำจิ้มซีอิ๊ว"], calories: 220, protein: 14, carb: 25, fat: 7, tagClean: false, tagLowCal: true, tagDessert: false, mealType: "SNACK", imageQuery: "steamed chicken dumplings" },
  { name: "ข้าวหน้าไก่สไตล์ญี่ปุ่น (ลดน้ำมัน)", description: "โอยาโกะดงไก่ไข่ สูตรลดน้ำมัน เสิร์ฟกับข้าวสวย", ingredients: ["ไก่สไลซ์", "ไข่", "หอมใหญ่", "ซอสดาชิ", "ข้าวสวย"], calories: 440, protein: 28, carb: 55, fat: 12, tagClean: false, tagLowCal: false, tagDessert: false, mealType: "LUNCH", imageQuery: "oyakodon chicken egg rice" },
  { name: "ซาชิมิรวม", description: "ซาชิมิปลาแซลมอนและทูน่ารวม เสิร์ฟเย็น", ingredients: ["แซลมอนสด", "ทูน่าสด", "วาซาบิ", "โชยุ", "ขิงดอง"], calories: 220, protein: 32, carb: 4, fat: 8, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "DINNER", imageQuery: "sashimi platter salmon tuna" },
  { name: "โอนิกิริไข่ปลา", description: "ข้าวปั้นโอนิกิริห่อสาหร่าย ไส้ไข่ปลา", ingredients: ["ข้าวสวย", "ไข่ปลา", "สาหร่ายโนริ", "งา"], calories: 180, protein: 6, carb: 34, fat: 2, tagClean: false, tagLowCal: true, tagDessert: false, mealType: "SNACK", imageQuery: "onigiri rice ball" },
  { name: "สลัดโรลผักรวมเต้าหู้", description: "สลัดโรลเวียดนามผักรวมและเต้าหู้ จิ้มน้ำจิ้มถั่ว", ingredients: ["แผ่นเปาะเปี๊ยะ", "เต้าหู้ทอด", "แครอท/แตงกวา", "วุ้นเส้น", "น้ำจิ้มถั่ว"], calories: 150, protein: 8, carb: 20, fat: 4, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "SNACK", imageQuery: "vegetable tofu spring rolls" },
  { name: "ซุปมิโสะเต้าหู้สาหร่าย", description: "ซุปมิโสะร้อนใส่เต้าหู้อ่อนและสาหร่ายวากาเมะ", ingredients: ["มิโสะ", "เต้าหู้อ่อน", "สาหร่ายวากาเมะ", "ต้นหอม"], calories: 90, protein: 6, carb: 8, fat: 3, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "SNACK", imageQuery: "miso soup tofu seaweed" },
  { name: "ยำถั่วพูกุ้งสด", description: "ยำถั่วพูกรอบใส่กุ้งสด รสเปรี้ยวเผ็ด", ingredients: ["ถั่วพู", "กุ้งลวก", "หอมแดง", "พริกขี้หนู", "มะนาว"], calories: 200, protein: 16, carb: 15, fat: 8, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "LUNCH", imageQuery: "thai winged bean salad shrimp" },
  { name: "แกงป่าไก่", description: "แกงป่าไก่รสจัดจ้าน ไม่ใส่กะทิ ใส่ผักรวม", ingredients: ["ไก่", "พริกแกงป่า", "หน่อไม้", "ใบมะกรูด", "พริกไทยอ่อน"], calories: 220, protein: 26, carb: 10, fat: 8, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "DINNER", imageQuery: "thai jungle curry chicken" },
  { name: "ต้มข่าไก่ นมข้นน้อย", description: "ต้มข่าไก่สูตรลดนมข้น รสเปรี้ยวเผ็ดกลมกล่อม", ingredients: ["ไก่", "ข่า/ตะไคร้", "นมข้นจืด (น้อย)", "เห็ดฟาง", "ใบมะกรูด"], calories: 260, protein: 20, carb: 12, fat: 15, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "DINNER", imageQuery: "tom kha gai coconut soup" },
  { name: "ผัดผักบุ้งไฟแดงกุ้ง", description: "ผักบุ้งไฟแดงผัดกับกุ้งสด น้ำมันน้อย", ingredients: ["ผักบุ้ง", "กุ้งสด", "กระเทียม/พริก", "ซอสหอยนางรม"], calories: 180, protein: 14, carb: 12, fat: 9, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "DINNER", imageQuery: "stir fried morning glory shrimp" },
  { name: "ไก่อบสมุนไพรไม่ทอด", description: "น่องไก่อบสมุนไพรไม่ใช้น้ำมันทอด หนังกรอบ", ingredients: ["น่องไก่", "โรสแมรี่", "กระเทียม", "น้ำมันมะกอกเล็กน้อย"], calories: 340, protein: 34, carb: 15, fat: 14, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "LUNCH", imageQuery: "herb roasted chicken thigh" },
  { name: "ปอเปี๊ยะสดกุ้ง", description: "ปอเปี๊ยะสดไส้กุ้งและผักสด จิ้มน้ำจิ้มบ๊วย", ingredients: ["แผ่นเปาะเปี๊ยะ", "กุ้งลวก", "ผักสลัด", "เส้นหมี่", "น้ำจิ้มบ๊วย"], calories: 160, protein: 10, carb: 25, fat: 2, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "SNACK", imageQuery: "fresh spring rolls shrimp" },
  { name: "เต้าหู้อบกรอบ น้ำจิ้มสุกี้", description: "เต้าหู้อบกรอบแทนการทอด เสิร์ฟกับน้ำจิ้มสุกี้", ingredients: ["เต้าหู้แข็ง", "แป้งทอดกรอบ", "น้ำจิ้มสุกี้", "ผักชี"], calories: 200, protein: 12, carb: 18, fat: 9, tagClean: false, tagLowCal: true, tagDessert: false, mealType: "SNACK", imageQuery: "crispy tofu dipping sauce" },
  { name: "สุกี้น้ำทะเลรวม", description: "สุกี้น้ำใส่อาหารทะเลรวม วุ้นเส้น และผัก", ingredients: ["กุ้ง/หมึก/ปลา", "วุ้นเส้น", "ผักรวม", "น้ำซุปสุกี้"], calories: 260, protein: 28, carb: 20, fat: 6, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "DINNER", imageQuery: "seafood suki soup" },
  { name: "ข้าวต้มกุ้ง", description: "ข้าวต้มกุ้งสด ใส่ขิงซอยและต้นหอม", ingredients: ["กุ้งสด", "ข้าวสวย", "ขิงซอย", "ต้นหอม/ผักชี"], calories: 240, protein: 18, carb: 32, fat: 4, tagClean: false, tagLowCal: true, tagDessert: false, mealType: "BREAKFAST", imageQuery: "shrimp rice porridge" },
  { name: "โจ๊กหมูใส่ไข่", description: "โจ๊กหมูสับใส่ไข่ลวก โรยขิงซอย", ingredients: ["หมูสับ", "ข้าวต้ม", "ไข่ลวก", "ขิงซอย", "ต้นหอม"], calories: 280, protein: 16, carb: 35, fat: 8, tagClean: false, tagLowCal: false, tagDessert: false, mealType: "BREAKFAST", imageQuery: "pork congee egg" },
  { name: "แพนเค้กกล้วยโปรตีน", description: "แพนเค้กแป้งโฮลวีทผสมกล้วยและเวย์โปรตีน", ingredients: ["แป้งโฮลวีท", "กล้วยหอม", "เวย์โปรตีน", "ไข่", "นมจืด"], calories: 320, protein: 20, carb: 40, fat: 8, tagClean: true, tagLowCal: false, tagDessert: true, mealType: "BREAKFAST", imageQuery: "banana protein pancakes" },
  { name: "แซนวิชไข่ขนมปังธัญพืช", description: "แซนวิชไข่ต้มบดผสมมัสตาร์ด ขนมปังโฮลวีท", ingredients: ["ไข่ต้มบด", "มัสตาร์ด", "ขนมปังโฮลวีท", "ผักกาดหอม"], calories: 300, protein: 16, carb: 32, fat: 12, tagClean: false, tagLowCal: false, tagDessert: false, mealType: "BREAKFAST", imageQuery: "whole wheat egg sandwich" },
  { name: "มัฟฟินไข่ผักรวม", description: "มัฟฟินไข่อบใส่ผักรวม โปรตีนสูง แคลต่ำ", ingredients: ["ไข่", "พริกหวาน", "หอมใหญ่", "ผักโขม", "ชีสไขมันต่ำ"], calories: 220, protein: 16, carb: 10, fat: 13, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "BREAKFAST", imageQuery: "egg muffin vegetables" },
  { name: "คุกกี้ข้าวโอ๊ตกล้วย ไม่ใส่แป้ง", description: "คุกกี้ข้าวโอ๊ตผสมกล้วยบด อบไม่ใส่แป้งสาลี", ingredients: ["ข้าวโอ๊ต", "กล้วยบด", "อบเชย", "ลูกเกด"], calories: 150, protein: 4, carb: 26, fat: 4, tagClean: true, tagLowCal: true, tagDessert: true, mealType: "SNACK", imageQuery: "oatmeal banana cookies" },
  { name: "พุดดิ้งเมล็ดเจียผลไม้", description: "พุดดิ้งเมล็ดเจียแช่นมอัลมอนด์ ท็อปด้วยผลไม้สด", ingredients: ["เมล็ดเจีย", "นมอัลมอนด์", "น้ำผึ้ง", "ผลไม้สด"], calories: 180, protein: 6, carb: 24, fat: 7, tagClean: true, tagLowCal: true, tagDessert: true, mealType: "SNACK", imageQuery: "chia seed pudding fruit" },
  { name: "กล้วยหอมเนยถั่ว", description: "กล้วยหอมหั่นทาเนยถั่วธรรมชาติ", ingredients: ["กล้วยหอม", "เนยถั่วธรรมชาติ"], calories: 210, protein: 6, carb: 28, fat: 9, tagClean: true, tagLowCal: false, tagDessert: true, mealType: "SNACK", imageQuery: "banana peanut butter" },
  { name: "ข้าวโพดต้ม", description: "ข้าวโพดหวานต้ม ของว่างแคลต่ำเส้นใยสูง", ingredients: ["ข้าวโพดหวาน"], calories: 120, protein: 3, carb: 26, fat: 1, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "SNACK", imageQuery: "boiled sweet corn" },
  { name: "เอดามาเมะนึ่ง", description: "ถั่วแระญี่ปุ่นนึ่งโรยเกลือเล็กน้อย", ingredients: ["ถั่วแระญี่ปุ่น", "เกลือ"], calories: 130, protein: 11, carb: 10, fat: 5, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "SNACK", imageQuery: "steamed edamame" },
  { name: "แครอทแท่งกับฮัมมัส", description: "แครอทหั่นแท่งจิ้มฮัมมัสถั่วชิกพี", ingredients: ["แครอท", "ฮัมมัสถั่วชิกพี"], calories: 140, protein: 5, carb: 15, fat: 7, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "SNACK", imageQuery: "carrot sticks hummus" },
  { name: "ไข่ขาวตุ๋นนมสด", description: "ไข่ขาวตุ๋นเนื้อนุ่มผสมนมสดจืด", ingredients: ["ไข่ขาว", "นมสดจืด", "ต้นหอม"], calories: 160, protein: 18, carb: 6, fat: 6, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "BREAKFAST", imageQuery: "steamed egg white custard" },
  { name: "สลัดไข่ต้มอะโวคาโด", description: "สลัดไข่ต้มผสมอะโวคาโดหั่นลูกเต๋า น้ำสลัดใส", ingredients: ["ไข่ต้ม", "อะโวคาโด", "ผักสลัด", "น้ำสลัดใส"], calories: 320, protein: 16, carb: 14, fat: 22, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "LUNCH", imageQuery: "egg avocado salad bowl" },
  { name: "ข้าวยำปักษ์ใต้", description: "ข้าวยำสมุนไพรปักษ์ใต้ ใส่ผักสดหลากชนิด", ingredients: ["ข้าวสวย", "ตะไคร้ซอย", "ถั่วฝักยาว", "มะพร้าวคั่ว", "น้ำบูดู", "มะนาว"], calories: 350, protein: 14, carb: 50, fat: 10, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "LUNCH", imageQuery: "thai southern rice salad khao yam" },
  { name: "แกงไตปลาผักรวม ลดกะทิ", description: "แกงไตปลารสจัดจ้าน สูตรลดกะทิ ใส่ผักรวม", ingredients: ["ไตปลา", "พริกแกงไตปลา", "ผักรวม (ถั่วฝักยาว/มะเขือ)", "ตะไคร้"], calories: 240, protein: 18, carb: 15, fat: 12, tagClean: false, tagLowCal: true, tagDessert: false, mealType: "DINNER", imageQuery: "thai fish curry vegetables" },
  { name: "หมูสะเต๊ะย่าง น้ำจิ้มถั่ว", description: "หมูสะเต๊ะย่างเสียบไม้ เสิร์ฟกับน้ำจิ้มถั่วและอาจาด", ingredients: ["หมูสไลซ์", "ผงกะหรี่", "กะทิหมัก", "น้ำจิ้มถั่ว", "อาจาด"], calories: 380, protein: 28, carb: 20, fat: 20, tagClean: false, tagLowCal: false, tagDessert: false, mealType: "LUNCH", imageQuery: "pork satay peanut sauce" },
  { name: "ไก่ย่างข้าวเหนียวกล้อง", description: "ไก่ย่างสมุนไพร เสิร์ฟกับข้าวเหนียวกล้องแทนขาว", ingredients: ["ไก่ทั้งตัว", "สมุนไพรหมัก", "ข้าวเหนียวกล้อง"], calories: 460, protein: 32, carb: 50, fat: 12, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "LUNCH", imageQuery: "grilled chicken sticky rice" },
  { name: "ปลาหมึกย่างซอสมะนาว", description: "ปลาหมึกย่างราดซอสมะนาวกระเทียมพริก", ingredients: ["ปลาหมึกสด", "กระเทียม/พริก", "มะนาว", "ผักชี"], calories: 220, protein: 28, carb: 8, fat: 7, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "DINNER", imageQuery: "grilled squid lime sauce" },
  { name: "ข้าวผัดกุ้งคลีน", description: "ข้าวผัดกุ้งสูตรคลีน น้ำมันน้อย ใส่ผักรวม", ingredients: ["กุ้งสด", "ข้าวกล้อง", "ไข่", "ผักรวม", "ซีอิ๊วขาว"], calories: 400, protein: 24, carb: 50, fat: 12, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "LUNCH", imageQuery: "shrimp fried rice" },
  { name: "ต้มแซ่บกระดูกหมู", description: "ต้มแซ่บกระดูกอ่อนหมู รสจัดจ้านสมุนไพร", ingredients: ["กระดูกอ่อนหมู", "ตะไคร้/ใบมะกรูด", "พริกป่น", "ผักชีฝรั่ง", "มะนาว"], calories: 260, protein: 22, carb: 12, fat: 14, tagClean: false, tagLowCal: true, tagDessert: false, mealType: "DINNER", imageQuery: "spicy pork bone soup thai" },
  { name: "สลัดผักกาดแก้วไก่ย่างเทอริยากิ", description: "ผักกาดแก้วสด ไก่ย่างเทอริยากิหั่นชิ้น", ingredients: ["ผักกาดแก้ว", "ไก่ย่างเทอริยากิ", "งาขาว", "น้ำสลัด"], calories: 340, protein: 28, carb: 25, fat: 12, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "LUNCH", imageQuery: "teriyaki chicken salad lettuce" },
  { name: "ข้าวกล้องแกงมัสมั่นไก่ กะทิน้อย", description: "แกงมัสมั่นไก่สูตรลดกะทิ เสิร์ฟกับข้าวกล้อง", ingredients: ["ไก่", "พริกแกงมัสมั่น", "กะทิ (น้อย)", "มันฝรั่ง", "ถั่วลิสง"], calories: 420, protein: 26, carb: 40, fat: 16, tagClean: false, tagLowCal: false, tagDessert: false, mealType: "DINNER", imageQuery: "massaman curry chicken" },
  { name: "ยำไข่ดาว", description: "ยำไข่ดาวกรอบ ใส่หอมแดงและพริกขี้หนู", ingredients: ["ไข่ดาว", "หอมแดง", "พริกขี้หนู", "มะนาว/น้ำปลา"], calories: 220, protein: 10, carb: 12, fat: 14, tagClean: false, tagLowCal: true, tagDessert: false, mealType: "LUNCH", imageQuery: "thai fried egg salad" },
  { name: "น้ำเก๊กฮวยไม่หวาน ข้าวเกรียบธัญพืช", description: "น้ำเก๊กฮวยสูตรไม่หวาน คู่ข้าวเกรียบธัญพืชอบ", ingredients: ["ดอกเก๊กฮวย", "ข้าวเกรียบธัญพืชอบ"], calories: 100, protein: 2, carb: 18, fat: 2, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "SNACK", imageQuery: "chrysanthemum tea crackers" },

  // ชุดที่ 3 — ขนม/ของหวานเพื่อสุขภาพ + เมนูทั่วไปเพิ่มเติม (ไม่ซ้ำของเดิม)
  { name: "มูสช็อกโกแลตอะโวคาโด", description: "มูสช็อกโกแลตเนื้อเนียนจากอะโวคาโด ไม่ใส่ครีม", ingredients: ["อะโวคาโด", "โกโก้ผงไม่หวาน", "น้ำผึ้ง", "นมอัลมอนด์"], calories: 180, protein: 4, carb: 18, fat: 11, tagClean: true, tagLowCal: true, tagDessert: true, mealType: "SNACK", imageQuery: "chocolate avocado mousse" },
  { name: "บราวนี่ถั่วดำไม่ใส่แป้ง", description: "บราวนี่เนื้อหนึบจากถั่วดำ ไม่ใส่แป้งสาลี", ingredients: ["ถั่วดำต้ม", "โกโก้ผง", "ไข่", "น้ำผึ้ง", "วานิลลา"], calories: 160, protein: 6, carb: 20, fat: 7, tagClean: true, tagLowCal: false, tagDessert: true, mealType: "SNACK", imageQuery: "black bean brownie" },
  { name: "ไอศกรีมกล้วยไม่ใส่นม", description: "นีซครีมจากกล้วยแช่แข็งปั่น เนื้อเนียนเหมือนไอศกรีม", ingredients: ["กล้วยแช่แข็ง", "โกโก้ผง (ไม่บังคับ)"], calories: 120, protein: 2, carb: 28, fat: 1, tagClean: true, tagLowCal: true, tagDessert: true, mealType: "SNACK", imageQuery: "banana nice cream" },
  { name: "เยลลี่ว่านหางจระเข้น้ำผึ้งมะนาว", description: "เยลลี่ว่านหางจระเข้เย็นๆ รสน้ำผึ้งมะนาว", ingredients: ["วุ้นว่านหางจระเข้", "น้ำผึ้ง", "มะนาว"], calories: 70, protein: 1, carb: 16, fat: 0, tagClean: true, tagLowCal: true, tagDessert: true, mealType: "SNACK", imageQuery: "aloe vera honey drink dessert" },
  { name: "ขนมปังกล้วยโฮลวีท", description: "ขนมปังกล้วยหอมอบจากแป้งโฮลวีท หอมอบเชย", ingredients: ["กล้วยหอมบด", "แป้งโฮลวีท", "ไข่", "น้ำมันมะพร้าว", "อบเชย"], calories: 210, protein: 5, carb: 34, fat: 7, tagClean: false, tagLowCal: false, tagDessert: true, mealType: "SNACK", imageQuery: "whole wheat banana bread" },
  { name: "พุดดิ้งมะพร้าวเจีย", description: "พุดดิ้งเมล็ดเจียแช่กะทิ โรยมะพร้าวขูด", ingredients: ["เมล็ดเจีย", "กะทิ", "น้ำผึ้ง", "มะพร้าวขูด"], calories: 190, protein: 5, carb: 18, fat: 11, tagClean: true, tagLowCal: false, tagDessert: true, mealType: "SNACK", imageQuery: "coconut chia pudding" },
  { name: "กราโนล่าบาร์โฮมเมด", description: "กราโนล่าบาร์อบเองจากข้าวโอ๊ตและถั่วรวม ไม่ใส่น้ำตาลทราย", ingredients: ["ข้าวโอ๊ต", "น้ำผึ้ง", "ถั่วรวม", "ลูกเกด", "เมล็ดฟักทอง"], calories: 170, protein: 5, carb: 22, fat: 7, tagClean: true, tagLowCal: false, tagDessert: true, mealType: "SNACK", imageQuery: "homemade granola bar" },
  { name: "เค้กแครอทไม่ใส่น้ำตาล", description: "เค้กแครอทเนื้อชุ่มฉ่ำ หวานจากน้ำผึ้งแทนน้ำตาลทราย", ingredients: ["แครอทขูด", "แป้งโฮลวีท", "ไข่", "อบเชย", "น้ำผึ้ง"], calories: 200, protein: 4, carb: 24, fat: 10, tagClean: false, tagLowCal: false, tagDessert: true, mealType: "SNACK", imageQuery: "carrot cake slice" },
  { name: "ลูกชุบถั่วเขียวลดหวาน", description: "ลูกชุบถั่วเขียวปั้นสวย สูตรลดน้ำตาล", ingredients: ["ถั่วเขียวนึ่ง", "น้ำตาลลดหวาน", "วุ้น", "สีผสมอาหารจากธรรมชาติ"], calories: 140, protein: 4, carb: 24, fat: 3, tagClean: false, tagLowCal: true, tagDessert: true, mealType: "SNACK", imageQuery: "thai mung bean dessert" },
  { name: "วุ้นกะทิใบเตยหญ้าหวาน", description: "วุ้นกะทิใบเตยหอมๆ หวานน้อยด้วยหญ้าหวาน", ingredients: ["วุ้นผง", "กะทิ", "ใบเตย", "หญ้าหวาน"], calories: 90, protein: 1, carb: 14, fat: 3, tagClean: false, tagLowCal: true, tagDessert: true, mealType: "SNACK", imageQuery: "pandan coconut jelly dessert" },
  { name: "ข้าวเหนียวมะม่วงสูตรลดน้ำตาล", description: "ข้าวเหนียวมะม่วงสูตรลดกะทิและน้ำตาล", ingredients: ["ข้าวเหนียว", "มะม่วงสุก", "กะทิ (น้อย)", "เกลือ"], calories: 280, protein: 5, carb: 55, fat: 5, tagClean: false, tagLowCal: false, tagDessert: true, mealType: "SNACK", imageQuery: "mango sticky rice" },
  { name: "คุกกี้อัลมอนด์ไร้แป้ง", description: "คุกกี้แป้งอัลมอนด์ กรอบนอกนุ่มใน ไม่ใส่แป้งสาลี", ingredients: ["แป้งอัลมอนด์", "ไข่", "น้ำผึ้ง", "วานิลลา"], calories: 150, protein: 5, carb: 10, fat: 11, tagClean: true, tagLowCal: false, tagDessert: true, mealType: "SNACK", imageQuery: "almond flour cookies" },
  { name: "เชียร์บาร์ถั่วรวม", description: "เอนเนอร์จี้บาร์อัดแน่นจากถั่วรวมและน้ำผึ้ง", ingredients: ["อัลมอนด์", "เม็ดมะม่วงหิมพานต์", "น้ำผึ้ง", "เมล็ดทานตะวัน"], calories: 190, protein: 6, carb: 18, fat: 11, tagClean: true, tagLowCal: false, tagDessert: true, mealType: "SNACK", imageQuery: "mixed nut energy bar" },
  { name: "โยเกิร์ตกรีกท็อปน้ำผึ้งวอลนัท", description: "โยเกิร์ตกรีกราดน้ำผึ้งและวอลนัทอบ", ingredients: ["โยเกิร์ตกรีก", "น้ำผึ้ง", "วอลนัท", "อบเชย"], calories: 220, protein: 14, carb: 18, fat: 11, tagClean: true, tagLowCal: false, tagDessert: true, mealType: "SNACK", imageQuery: "yogurt honey walnut bowl" },
  { name: "แอปเปิลอบอบเชย", description: "แอปเปิลอบทั้งลูกโรยอบเชย หวานธรรมชาติ", ingredients: ["แอปเปิล", "อบเชย", "น้ำผึ้งเล็กน้อย"], calories: 110, protein: 1, carb: 26, fat: 1, tagClean: true, tagLowCal: true, tagDessert: true, mealType: "SNACK", imageQuery: "baked cinnamon apple" },
  { name: "สตรอว์เบอร์รี่จุ่มดาร์กช็อกโกแลต", description: "สตรอว์เบอร์รี่สดจุ่มดาร์กช็อกโกแลต 70%", ingredients: ["สตรอว์เบอร์รี่", "ดาร์กช็อกโกแลต 70%"], calories: 160, protein: 2, carb: 20, fat: 9, tagClean: false, tagLowCal: false, tagDessert: true, mealType: "SNACK", imageQuery: "chocolate dipped strawberries" },
  { name: "มัฟฟินกล้วยข้าวโอ๊ตไม่ใส่แป้ง", description: "มัฟฟินกล้วยหอมข้าวโอ๊ตบด ไม่ใส่แป้งสาลี", ingredients: ["ข้าวโอ๊ตบด", "กล้วยหอม", "ไข่", "ผงฟู"], calories: 170, protein: 6, carb: 26, fat: 5, tagClean: true, tagLowCal: false, tagDessert: true, mealType: "SNACK", imageQuery: "banana oat muffin" },
  { name: "ป๊อปคอร์นโฮลเกรนไม่ใส่เนย", description: "ป๊อปคอร์นอบลมร้อน ไม่ใส่เนยหรือน้ำมัน", ingredients: ["ข้าวโพดคั่ว", "เกลือเล็กน้อย"], calories: 100, protein: 3, carb: 20, fat: 1, tagClean: true, tagLowCal: true, tagDessert: true, mealType: "SNACK", imageQuery: "air popped popcorn bowl" },
  { name: "ข้าวซอยไก่ ลดกะทิ", description: "ข้าวซอยไก่สูตรลดกะทิ เส้นบะหมี่กรอบโรยหน้า", ingredients: ["ไก่", "พริกแกงข้าวซอย", "กะทิ (น้อย)", "เส้นบะหมี่", "ผักกาดดอง"], calories: 420, protein: 26, carb: 45, fat: 14, tagClean: false, tagLowCal: false, tagDessert: false, mealType: "LUNCH", imageQuery: "khao soi chicken noodle" },
  { name: "ผัดหมี่โคราช ลดน้ำมัน", description: "ผัดหมี่โคราชสูตรน้ำมันน้อย รสเปรี้ยวหวาน", ingredients: ["เส้นหมี่โคราช", "หมูสับ", "ถั่วงอก", "ซอสมะขาม", "ไข่"], calories: 380, protein: 16, carb: 58, fat: 9, tagClean: false, tagLowCal: true, tagDessert: false, mealType: "LUNCH", imageQuery: "pad mee korat noodles" },
  { name: "หมูปิ้งไม่ติดมัน", description: "หมูปิ้งจากสันในหมัก ไม่ติดมัน ย่างไม่ใช้น้ำมัน", ingredients: ["หมูสันในหมัก", "กระเทียม", "ผักชีราก", "น้ำปลา"], calories: 220, protein: 26, carb: 6, fat: 10, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "SNACK", imageQuery: "thai grilled pork skewers moo ping" },
  { name: "ยำปลาดุกฟู", description: "ปลาดุกฟูกรอบยำกับมะม่วงเปรี้ยว รสจัดจ้าน", ingredients: ["ปลาดุกฟู", "มะม่วงเปรี้ยว", "พริก", "มะนาว"], calories: 260, protein: 20, carb: 15, fat: 14, tagClean: false, tagLowCal: false, tagDessert: false, mealType: "LUNCH", imageQuery: "crispy catfish salad thai" },
  { name: "สลัดโรลทูน่าอะโวคาโด", description: "สลัดโรลข้าวห่อสาหร่ายไส้ทูน่าและอะโวคาโด", ingredients: ["ทูน่า", "อะโวคาโด", "แผ่นสาหร่าย", "ข้าวสวย"], calories: 190, protein: 14, carb: 18, fat: 8, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "SNACK", imageQuery: "tuna avocado roll" },
  { name: "ซุปเห็ดรวม", description: "ซุปเห็ดรวมน้ำใส ใส่ต้นหอมและพริกไทย", ingredients: ["เห็ดรวม", "ต้นหอม", "ซีอิ๊วขาว", "พริกไทย"], calories: 110, protein: 6, carb: 12, fat: 4, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "DINNER", imageQuery: "mixed mushroom soup" },
  { name: "ผัดคะน้าปลาเค็ม ลดเค็ม", description: "คะน้าผัดปลาเค็มสูตรลดเค็ม กระเทียมพริกหอม", ingredients: ["คะน้า", "ปลาเค็ม (น้อย)", "กระเทียม", "พริก"], calories: 200, protein: 14, carb: 10, fat: 12, tagClean: false, tagLowCal: true, tagDessert: false, mealType: "DINNER", imageQuery: "stir fried kale salted fish" },
  { name: "ข้าวผัดปูคลีน", description: "ข้าวผัดเนื้อปูสูตรคลีน ใช้ข้าวกล้อง", ingredients: ["เนื้อปู", "ข้าวกล้อง", "ไข่", "ต้นหอม"], calories: 400, protein: 22, carb: 50, fat: 12, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "LUNCH", imageQuery: "crab fried rice" },
  { name: "ต้มโคล้งปลากรอบ", description: "ต้มโคล้งรสจัดจ้าน ใส่ปลากรอบและมะขามเปียก", ingredients: ["ปลากรอบ", "ตะไคร้", "ใบมะกรูด", "มะขามเปียก"], calories: 200, protein: 18, carb: 15, fat: 7, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "DINNER", imageQuery: "thai spicy fish soup" },
  { name: "แกงคั่วกลิ้งไก่", description: "แกงคั่วกลิ้งไก่สับรสจัดจ้าน สไตล์ปักษ์ใต้", ingredients: ["ไก่สับ", "พริกแกงคั่วกลิ้ง", "ใบมะกรูด", "ตะไคร้"], calories: 280, protein: 26, carb: 10, fat: 16, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "DINNER", imageQuery: "thai dry curry chicken" },
  { name: "ยำมะเขือยาว", description: "มะเขือยาวย่างยำกับกุ้งแห้งและหอมแดง", ingredients: ["มะเขือยาวย่าง", "กุ้งแห้ง", "หอมแดง", "มะนาว"], calories: 130, protein: 6, carb: 14, fat: 6, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "LUNCH", imageQuery: "grilled eggplant salad thai" },
  { name: "ผัดถั่วงอกเต้าหู้", description: "ถั่วงอกผัดเต้าหู้และกุยช่าย น้ำมันน้อย", ingredients: ["ถั่วงอก", "เต้าหู้", "กุยช่าย", "ซีอิ๊วขาว"], calories: 170, protein: 10, carb: 14, fat: 8, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "DINNER", imageQuery: "tofu beansprouts stir fry" },
  { name: "ไก่ห่อใบเตย", description: "อกไก่หมักห่อใบเตยนึ่ง หอมกลิ่นใบเตย", ingredients: ["อกไก่หมัก", "ใบเตย", "กระเทียม", "พริกไทย"], calories: 300, protein: 28, carb: 15, fat: 13, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "LUNCH", imageQuery: "pandan wrapped chicken" },
  { name: "ต้มยำปลาน้ำใส", description: "ต้มยำปลากะพงน้ำใส เผ็ดเปรี้ยวสดชื่น", ingredients: ["ปลากะพง", "ตะไคร้", "ใบมะกรูด", "พริกขี้หนู", "มะนาว"], calories: 160, protein: 20, carb: 8, fat: 5, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "DINNER", imageQuery: "tom yum fish clear soup" },
  { name: "ข้าวผัดคะน้าไก่", description: "ข้าวผัดคะน้าใส่ไก่สับ กระเทียมหอม", ingredients: ["ไก่สับ", "คะน้า", "ข้าวสวย", "กระเทียม"], calories: 400, protein: 24, carb: 48, fat: 12, tagClean: false, tagLowCal: false, tagDessert: false, mealType: "LUNCH", imageQuery: "kale chicken fried rice" },
  { name: "สลัดอกไก่มะม่วง", description: "สลัดอกไก่ย่างกับมะม่วงดิบซอย รสแซ่บ", ingredients: ["อกไก่ย่าง", "มะม่วงดิบซอย", "ถั่วลิสงป่น", "น้ำปลาหวาน"], calories: 300, protein: 26, carb: 25, fat: 9, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "LUNCH", imageQuery: "chicken mango salad thai" },
  { name: "น้ำใบบัวบกไม่หวาน", description: "น้ำใบบัวบกคั้นสด สูตรไม่ใส่น้ำตาล", ingredients: ["ใบบัวบก", "น้ำเปล่า", "หญ้าหวาน"], calories: 40, protein: 1, carb: 8, fat: 0, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "SNACK", imageQuery: "pennywort juice" },
  { name: "น้ำมะพร้าวสด", description: "น้ำมะพร้าวอ่อนสดชื่น ดื่มเย็นๆ", ingredients: ["น้ำมะพร้าวอ่อน"], calories: 60, protein: 0, carb: 14, fat: 0, tagClean: true, tagLowCal: true, tagDessert: false, mealType: "SNACK", imageQuery: "fresh coconut water" },
  { name: "สมูทตี้ผักโขมกล้วย", description: "สมูทตี้ผักโขมปั่นกับกล้วยหอมและนมอัลมอนด์", ingredients: ["ผักโขม", "กล้วยหอม", "นมอัลมอนด์", "น้ำผึ้ง"], calories: 190, protein: 5, carb: 40, fat: 3, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "BREAKFAST", imageQuery: "spinach banana smoothie" },
  { name: "เต้าฮวยนมสด ลดน้ำเชื่อม", description: "เต้าฮวยนุ่มราดนมสด สูตรลดน้ำเชื่อม", ingredients: ["เต้าฮวย", "นมสด", "น้ำขิง (ลดหวาน)"], calories: 130, protein: 8, carb: 18, fat: 3, tagClean: false, tagLowCal: true, tagDessert: true, mealType: "SNACK", imageQuery: "tofu pudding dessert" },
  { name: "ข้าวเหนียวถั่วดำ", description: "ข้าวเหนียวนึ่งใส่ถั่วดำ โรยงาขาว", ingredients: ["ข้าวเหนียว", "ถั่วดำต้ม", "เกลือ", "งาขาว"], calories: 250, protein: 7, carb: 50, fat: 3, tagClean: true, tagLowCal: false, tagDessert: false, mealType: "BREAKFAST", imageQuery: "black bean sticky rice" },
  { name: "ปอเปี๊ยะเผือกอบ", description: "ปอเปี๊ยะไส้เผือกบด อบแทนทอด หวานน้อย", ingredients: ["เผือกนึ่งบด", "แผ่นเปาะเปี๊ยะ", "น้ำตาลลดหวาน"], calories: 170, protein: 4, carb: 28, fat: 5, tagClean: false, tagLowCal: true, tagDessert: true, mealType: "SNACK", imageQuery: "baked taro spring rolls" },
];

async function main() {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    throw new Error("PEXELS_API_KEY is required in .env (สมัครฟรีที่ pexels.com/api)");
  }

  const existingRows = await db.select({ id: menuItems.id, name: menuItems.name }).from(menuItems);
  const existingByName = new Map(existingRows.map((r) => [r.name, r.id]));

  let created = 0;
  let updated = 0;
  let imageFailed = 0;

  for (const menu of MENUS) {
    const existingId = existingByName.get(menu.name);

    if (existingId) {
      // มีอยู่แล้ว — อัปเดตข้อมูล (ไม่แตะรูป ไม่โหลดซ้ำ)
      await db
        .update(menuItems)
        .set({
          description: menu.description,
          ingredients: menu.ingredients,
          calories: menu.calories,
          protein: menu.protein,
          carb: menu.carb,
          fat: menu.fat,
          tagClean: menu.tagClean,
          tagLowCal: menu.tagLowCal,
          tagDessert: menu.tagDessert,
          mealType: menu.mealType,
        })
        .where(eq(menuItems.id, existingId));
      updated++;
      console.log(`   ↻ อัปเดต: ${menu.name}`);
      continue;
    }

    let imagePath: string | null = null;
    let imageCredit: string | null = null;
    try {
      const photos = await searchPexelsPhotos(menu.imageQuery, apiKey);
      const downloaded = await downloadFirstWorkingPhoto(photos);
      if (downloaded) {
        imagePath = await saveMenuImage(downloaded.buffer);
        imageCredit = `ภาพโดย ${downloaded.photographer} จาก Pexels`;
      }
      if (!imagePath) imageFailed++;
    } catch (err) {
      imageFailed++;
      console.warn(`   ⚠️  หารูปไม่สำเร็จสำหรับ "${menu.name}":`, (err as Error).message);
    }

    await db.insert(menuItems).values({
      name: menu.name,
      description: menu.description,
      ingredients: menu.ingredients,
      imagePath,
      imageCredit,
      calories: menu.calories,
      protein: menu.protein,
      carb: menu.carb,
      fat: menu.fat,
      tagClean: menu.tagClean,
      tagLowCal: menu.tagLowCal,
      tagDessert: menu.tagDessert,
      mealType: menu.mealType,
    });
    created++;
    console.log(`   ${imagePath ? "✅" : "⚠️ (ไม่มีรูป)"} ${menu.name}`);

    // เว้นจังหวะกันยิง Pexels ถี่เกินไป
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(
    `\n✅ เสร็จแล้ว — เพิ่มใหม่ ${created} เมนู, อัปเดต ${updated} เมนู, หารูปไม่สำเร็จ ${imageFailed} เมนู`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ seed เมนูล้มเหลว:", e);
  process.exit(1);
});
