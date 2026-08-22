import { redirect } from "next/navigation";

// ย้ายไปรวมกับหน้า "เครื่องมือสุขภาพ" แล้ว (BMI/TDEE เป็นแท็บแรก) — คงหน้านี้ไว้เผื่อมีลิงก์เก่า
export default function ClientCalculatorRedirectPage() {
  redirect("/client/tools");
}
