"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * "내 도감" 수집 목록 (브라우저 localStorage)
 * 계정 없이 시작하고, 가족 기능(HERO_MAKER.md H0)이 생기면 DB로 옮깁니다.
 * 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서는 조용히 빈 목록으로 동작합니다.
 */
const KEY = "hero-dex:collected:v1";
const EVENT = "hero-dex:collected-change";
const EMPTY = "[]";

function read(): string {
  try {
    return window.localStorage.getItem(KEY) ?? EMPTY;
  } catch {
    return EMPTY;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

function parse(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** 카드 id는 "세계관/slug" 형식입니다. */
export function useCollected(cardId: string) {
  const raw = useSyncExternalStore(subscribe, read, () => EMPTY);
  const collected = parse(raw).includes(cardId);

  const toggle = useCallback(() => {
    const list = parse(read());
    const next = list.includes(cardId) ? list.filter((x) => x !== cardId) : [...list, cardId];
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // 저장소를 쓸 수 없으면 무시합니다.
    }
    window.dispatchEvent(new Event(EVENT));
  }, [cardId]);

  return { collected, toggle };
}
