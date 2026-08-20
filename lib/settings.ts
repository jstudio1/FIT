import { eq } from "drizzle-orm";
import { db } from "./db";
import { siteSettings, type SiteSettings } from "./db/schema";

export const DEFAULT_SETTINGS: Omit<SiteSettings, "id" | "updatedAt"> = {
  siteName: "Trainner",
  metaTitle: "Trainner — ระบบจัดการลูกเทรน",
  metaDescription: "ระบบสำหรับเทรนเนอร์จัดการลูกเทรนของตัวเอง",
  keywords: null,
  contactEmail: null,
  popupEnabled: false,
  popupImagePath: null,
  popupTitle: null,
  popupLinkUrl: null,
  chatEnabled: true,
  gamificationEnabled: true,
  pointsTrainingCompleted: 10,
  pointsFoodLogged: 2,
  pointsBadgeBonus: 20,
  bookingCancelWindowHours: 6,
  sessionDurationMin: 60,
  chatMaxMessageLength: 2000,
  chatDeleteWindowMin: 5,
  maxUploadSizeMb: 10,
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
      popupEnabled: row.popupEnabled,
      popupImagePath: row.popupImagePath,
      popupTitle: row.popupTitle,
      popupLinkUrl: row.popupLinkUrl,
      chatEnabled: row.chatEnabled,
      gamificationEnabled: row.gamificationEnabled,
      pointsTrainingCompleted: row.pointsTrainingCompleted,
      pointsFoodLogged: row.pointsFoodLogged,
      pointsBadgeBonus: row.pointsBadgeBonus,
      bookingCancelWindowHours: row.bookingCancelWindowHours ?? DEFAULT_SETTINGS.bookingCancelWindowHours,
      sessionDurationMin: row.sessionDurationMin ?? DEFAULT_SETTINGS.sessionDurationMin,
      chatMaxMessageLength: row.chatMaxMessageLength ?? DEFAULT_SETTINGS.chatMaxMessageLength,
      chatDeleteWindowMin: row.chatDeleteWindowMin ?? DEFAULT_SETTINGS.chatDeleteWindowMin,
      maxUploadSizeMb: row.maxUploadSizeMb ?? DEFAULT_SETTINGS.maxUploadSizeMb,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
