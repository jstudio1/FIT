import "server-only";

/** ค้นหา+ดาวน์โหลดรูปจาก Pexels — ใช้ทั้งตอน seed เมนู และตอน owner กดค้นรูปใหม่จากหลังบ้าน */

export type PexelsPhoto = {
  photographer: string;
  src: { large: string; medium: string };
};

export async function searchPexelsPhotos(
  query: string,
  apiKey: string,
  perPage = 3,
): Promise<PexelsPhoto[]> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=square`;
  const res = await fetch(url, { headers: { Authorization: apiKey } });
  if (!res.ok) return [];
  const data = (await res.json()) as { photos: PexelsPhoto[] };
  return data.photos;
}

/** ลองดาวน์โหลดรูปทีละอันจนกว่าจะสำเร็จ — บางรูปต้นทางเสียบน Pexels เอง (เจอ 422 ได้) */
export async function downloadFirstWorkingPhoto(
  photos: PexelsPhoto[],
): Promise<{ buffer: Buffer; photographer: string } | null> {
  for (const photo of photos) {
    try {
      const res = await fetch(photo.src.medium);
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      return { buffer, photographer: photo.photographer };
    } catch {
      continue;
    }
  }
  return null;
}

/** ค้น+ดาวน์โหลดรูปแรกที่ใช้ได้ในขั้นตอนเดียว — คืน null ถ้าไม่มี PEXELS_API_KEY หรือหาไม่เจอเลย */
export async function fetchPexelsPhoto(
  query: string,
): Promise<{ buffer: Buffer; photographer: string } | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;
  const photos = await searchPexelsPhotos(query, apiKey);
  return downloadFirstWorkingPhoto(photos);
}
