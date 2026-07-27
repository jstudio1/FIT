import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import { readPopupImage } from "@/lib/upload";

export async function GET() {
  const viewer = await getSessionUser();
  if (!viewer) return new NextResponse("Unauthorized", { status: 401 });

  const settings = await getSiteSettings();
  if (!settings.popupImagePath) return new NextResponse("Not found", { status: 404 });

  const buffer = await readPopupImage(settings.popupImagePath);
  if (!buffer) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
