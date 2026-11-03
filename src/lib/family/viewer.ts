import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";
import { getDb } from "@/lib/db";

import { isValidParentToken } from "./pin";

export const PROFILE_COOKIE = "hd_profile";
export const PARENT_COOKIE = "hd_parent";

export type ViewerProfile = { id: string; nickname: string; avatar: string };

export type Viewer = {
  user: { id: string; email: string; name: string };
  family: { id: string; profiles: ViewerProfile[] } | null;
  /** 지금 고른 아이 프로필 (쿠키 값이 이 가족의 프로필일 때만) */
  profile: ViewerProfile | null;
  /** 부모 PIN을 확인한 지 10분 이내인지 */
  parentMode: boolean;
};

/**
 * 지금 요청한 사람의 정보. 한 요청 안에서는 한 번만 조회합니다.
 * 로그인하지 않았으면 null입니다.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  // 쿠키를 먼저 읽어 요청 시점 코드임을 표시합니다. 미리 그리기(prerender) 중에는 여기서 멈추므로
  // 인증 SDK가 끝난 prerender에서 쿠키를 읽다가 오류를 남기지 않습니다.
  const jar = await cookies();
  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const family = await getDb().family.findUnique({
    where: { ownerId: user.id },
    select: {
      id: true,
      profiles: {
        select: { id: true, nickname: true, avatar: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  const profileId = jar.get(PROFILE_COOKIE)?.value;
  const profile = family?.profiles.find((p) => p.id === profileId) ?? null;
  const parentMode = family ? isValidParentToken(jar.get(PARENT_COOKIE)?.value, family.id) : false;

  return {
    user: { id: user.id, email: user.email, name: user.name },
    family,
    profile,
    parentMode,
  };
});

/** 로그인 + 가족 설정까지 마친 사람만. 아니면 알맞은 화면으로 보냅니다. */
export async function requireFamily(): Promise<Viewer & { family: NonNullable<Viewer["family"]> }> {
  const viewer = await getViewer();
  if (!viewer) redirect("/auth/sign-in");
  if (!viewer.family) redirect("/setup");
  return viewer as Viewer & { family: NonNullable<Viewer["family"]> };
}

/** 도감 화면: 아이 프로필까지 고른 상태여야 합니다. 안 골랐으면 프로필 고르기로 보냅니다. */
export async function requireProfile() {
  const viewer = await requireFamily();
  if (!viewer.profile) redirect("/me");
  return viewer as typeof viewer & { profile: ViewerProfile };
}

/**
 * 서버 액션용: 화면 이동(redirect) 대신 실패를 돌려줍니다.
 * 서버 액션은 외부에서 직접 호출될 수 있으므로, 모든 액션 첫 줄에서 부릅니다.
 */
export async function getFamilyViewerOrNull() {
  const viewer = await getViewer();
  if (!viewer?.family) return null;
  return viewer as Viewer & { family: NonNullable<Viewer["family"]> };
}
