import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { menuItems } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { readMenuImage } from "@/lib/upload";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getSessionUser();
  if (!viewer) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const menuId = Number(id);
  if (!Number.isFinite(menuId)) return new NextResponse("Bad request", { status: 400 });

  const [item] = await db
    .select({ imagePath: menuItems.imagePath })
    .from(menuItems)
    .where(eq(menuItems.id, menuId))
    .limit(1);
  if (!item?.imagePath) return new NextResponse("Not found", { status: 404 });

  const buffer = await readMenuImage(item.imagePath);
  if (!buffer) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
