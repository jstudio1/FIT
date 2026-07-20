import { redirect } from "next/navigation";

// middleware จะ redirect "/" ตามสถานะล็อกอินอยู่แล้ว นี่คือ fallback
export default function RootPage() {
  redirect("/login");
}
