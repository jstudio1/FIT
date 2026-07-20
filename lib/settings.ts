import { eq } from "drizzle-orm";
import { db } from "./db";
import { siteSettings, type SiteSettings } from "./db/schema";

export const DEFAULT_SETTINGS: Omit<SiteSettings, "id" | "updatedAt"> = {
  siteName: "Trainner",
  metaTitle: "Trainner — ระบบจัดการลูกเทรน",
  metaDescription: "ระบบสำหรับเทรนเนอร์จัดการลูกเทรนของตัวเอง",
  keywords: null,
  contactEmail: null,
};

export async function getSiteSettings(): Promise<
  Omit<SiteSettings, "id" | "updatedAt">
> {
  try {
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.id, 1))
      .limit(1);
    if (!row) return DEFAULT_SETTINGS;
    return {
      siteName: row.siteName || DEFAULT_SETTINGS.siteName,
      metaTitle: row.metaTitle || DEFAULT_SETTINGS.metaTitle,
      metaDescription: row.metaDescription || DEFAULT_SETTINGS.metaDescription,
      keywords: row.keywords,
      contactEmail: row.contactEmail,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
