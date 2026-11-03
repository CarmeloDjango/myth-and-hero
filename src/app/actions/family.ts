"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { AVATAR_KEYS, MAX_PROFILES } from "@/lib/family/avatars";
import { createParentToken, hashPin, PARENT_MODE_TTL_MS, PIN_PATTERN, verifyPin } from "@/lib/family/pin";
import { getFamilyViewerOrNull, getViewer, PARENT_COOKIE, PROFILE_COOKIE } from "@/lib/family/viewer";

export type FormState = { error?: string; ok?: boolean } | undefined;

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

const nickname = z
  .string()
  .trim()
  .min(1, "아이 별명을 적어 주세요.")
  .max(12, "별명은 12글자까지 쓸 수 있어요.");
const avatar = z.enum(AVATAR_KEYS);
const pin = z.string().regex(PIN_PATTERN, "PIN은 숫자 4~6자리로 정해 주세요.");

/** 처음 로그인한 부모: 부모 PIN과 아이 프로필(1~4명)을 정해 가족을 만듭니다. */
export async function createFamilyAction(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "로그인이 필요해요." };
  if (viewer.family) redirect("/me");

  const profiles: { nickname: string; avatar: string }[] = [];
  for (let i = 0; i < MAX_PROFILES; i++) {
    const n = String(form.get(`nickname_${i}`) ?? "").trim();
    if (!n) continue;
    profiles.push({ nickname: n, avatar: String(form.get(`avatar_${i}`) ?? "") });
  }

  const parsed = z
    .object({
      pin,
      pinConfirm: z.string(),
      profiles: z.array(z.object({ nickname, avatar })).min(1, "아이 프로필을 하나 이상 만들어 주세요."),
    })
    .refine((v) => v.pin === v.pinConfirm, { message: "PIN 두 번이 서로 달라요.", path: ["pinConfirm"] })
    .safeParse({ pin: form.get("pin"), pinConfirm: form.get("pinConfirm"), profiles });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "입력을 확인해 주세요." };

  const db = getDb();
  await db.family.create({
    data: {
      ownerId: viewer.user.id,
      parentPinHash: await hashPin(parsed.data.pin),
      profiles: {
        create: parsed.data.profiles.map((p, order) => ({ nickname: p.nickname, avatar: p.avatar, order })),
      },
    },
  });
  redirect("/me");
}

/** 아이가 자기 아바타를 누르면 바로 들어갑니다 (비밀번호 없음). */
export async function selectProfileAction(profileId: string) {
  const viewer = await getFamilyViewerOrNull();
  if (!viewer) redirect("/auth/sign-in");
  if (!viewer.family.profiles.some((p) => p.id === profileId)) redirect("/me");

  const jar = await cookies();
  jar.set(PROFILE_COOKIE, profileId, { ...cookieBase, maxAge: 60 * 60 * 24 * 365 });
  redirect("/");
}

/** 부모 모드 들어가기: PIN 확인 후 10분 동안 유지됩니다. */
export async function enterParentModeAction(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await getFamilyViewerOrNull();
  if (!viewer) return { error: "로그인이 필요해요." };

  const family = await getDb().family.findUnique({
    where: { id: viewer.family.id },
    select: { parentPinHash: true },
  });
  const input = String(form.get("pin") ?? "");
  if (!family || !PIN_PATTERN.test(input) || !(await verifyPin(input, family.parentPinHash))) {
    return { error: "PIN이 맞지 않아요." };
  }

  const jar = await cookies();
  jar.set(PARENT_COOKIE, createParentToken(viewer.family.id), {
    ...cookieBase,
    maxAge: Math.floor(PARENT_MODE_TTL_MS / 1000),
  });
  redirect("/parent");
}

export async function exitParentModeAction() {
  const jar = await cookies();
  jar.delete(PARENT_COOKIE);
  redirect("/me");
}

/** 부모 모드에서만: 가족 확인 + 부모 모드 확인 */
async function requireParentMode() {
  const viewer = await getFamilyViewerOrNull();
  if (!viewer || !viewer.parentMode) return null;
  return viewer;
}

export async function updateProfileAction(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireParentMode();
  if (!viewer) return { error: "부모 모드에서만 바꿀 수 있어요." };

  const parsed = z
    .object({ id: z.string().min(1), nickname, avatar })
    .safeParse({ id: form.get("id"), nickname: form.get("nickname"), avatar: form.get("avatar") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!viewer.family.profiles.some((p) => p.id === parsed.data.id)) return { error: "우리 가족 프로필이 아니에요." };

  await getDb().childProfile.update({
    where: { id: parsed.data.id },
    data: { nickname: parsed.data.nickname, avatar: parsed.data.avatar },
  });
  return { ok: true };
}

export async function addProfileAction(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireParentMode();
  if (!viewer) return { error: "부모 모드에서만 추가할 수 있어요." };
  if (viewer.family.profiles.length >= MAX_PROFILES) return { error: `프로필은 ${MAX_PROFILES}명까지 만들 수 있어요.` };

  const parsed = z
    .object({ nickname, avatar })
    .safeParse({ nickname: form.get("nickname"), avatar: form.get("avatar") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await getDb().childProfile.create({
    data: { familyId: viewer.family.id, ...parsed.data, order: viewer.family.profiles.length },
  });
  return { ok: true };
}

export async function deleteProfileAction(profileId: string): Promise<FormState> {
  const viewer = await requireParentMode();
  if (!viewer) return { error: "부모 모드에서만 지울 수 있어요." };
  if (!viewer.family.profiles.some((p) => p.id === profileId)) return { error: "우리 가족 프로필이 아니에요." };
  if (viewer.family.profiles.length <= 1) return { error: "프로필은 하나 이상 있어야 해요." };

  await getDb().childProfile.delete({ where: { id: profileId } });
  const jar = await cookies();
  if (jar.get(PROFILE_COOKIE)?.value === profileId) jar.delete(PROFILE_COOKIE);
  return { ok: true };
}
