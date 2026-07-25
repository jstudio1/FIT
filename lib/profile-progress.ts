export type ProfileStep = { key: string; label: string; done: boolean };

type ProfileFields = {
  avatarPath: string | null;
  nickname: string | null;
  email: string | null;
  phone: string | null;
};

export function computeClientSteps(
  user: ProfileFields,
  hasHealthProfile: boolean,
): ProfileStep[] {
  return [
    { key: "avatar", label: "รูปโปรไฟล์", done: !!user.avatarPath },
    { key: "nickname", label: "ชื่อเล่น", done: !!user.nickname },
    { key: "email", label: "อีเมล", done: !!user.email },
    { key: "phone", label: "เบอร์โทรศัพท์", done: !!user.phone },
    { key: "health", label: "ข้อมูลสุขภาพ/เป้าหมาย", done: hasHealthProfile },
  ];
}

export function computeTrainerSteps(
  user: ProfileFields & { bio: string | null },
): ProfileStep[] {
  return [
    { key: "avatar", label: "รูปโปรไฟล์", done: !!user.avatarPath },
    { key: "nickname", label: "ชื่อเล่น", done: !!user.nickname },
    { key: "bio", label: "แนะนำตัว", done: !!user.bio },
    { key: "email", label: "อีเมล", done: !!user.email },
    { key: "phone", label: "เบอร์โทรศัพท์", done: !!user.phone },
  ];
}
