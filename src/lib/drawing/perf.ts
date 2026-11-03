/**
 * 그리기 가볍게 하기 (아이패드 미니에서도 끊기지 않게)
 */
import type { Stroke } from "@/lib/heroes/rules";

/** 한 획이 이 점 수를 넘으면 나눠서 확정합니다 (서버는 한 획 5000점까지 받음). */
export const STROKE_POINTS_SPLIT = 1500;

/**
 * 새 점을 남길지: 앞 점과 화면에서 1픽셀 이상 떨어졌을 때만.
 * 그림 좌표(1024)로는 확대 배율에 따라 2/배율 (확대해서 그리면 더 촘촘하게).
 * 필압이 크게 바뀐 점은 가까워도 남깁니다 (선 굵기가 자연스럽게).
 */
export function keepPoint(prev: readonly number[] | undefined, next: readonly number[], scale = 1): boolean {
  if (!prev) return true;
  const min = 2 / Math.max(1, scale);
  if (Math.abs(next[0] - prev[0]) >= min || Math.abs(next[1] - prev[1]) >= min) return true;
  return Math.abs((next[2] ?? 0.5) - (prev[2] ?? 0.5)) >= 0.15;
}

/** 저장 안 된 그림을 이 기기에 잠깐 맡겨 두기 (Safari가 메모리 때문에 페이지를 새로 열어도 되살리려고) */
const backupKey = (saveUrl: string) => `drawing-backup:${saveUrl}`;

export function writeBackup(saveUrl: string, strokes: Stroke[]): void {
  try {
    localStorage.setItem(backupKey(saveUrl), JSON.stringify({ at: Date.now(), strokes }));
  } catch {
    /* 저장 공간이 꽉 찼으면 맡기지 않음 (서버 저장은 그대로) */
  }
}

export function readBackup(saveUrl: string): Stroke[] | null {
  try {
    const raw = localStorage.getItem(backupKey(saveUrl));
    if (!raw) return null;
    const d = JSON.parse(raw) as { at: number; strokes: Stroke[] };
    // 하루가 지난 맡김은 버립니다 (다른 사람이 그사이 고쳤을 수 있음)
    if (!Array.isArray(d.strokes) || Date.now() - d.at > 24 * 60 * 60 * 1000) {
      clearBackup(saveUrl);
      return null;
    }
    return d.strokes;
  } catch {
    return null;
  }
}

export function clearBackup(saveUrl: string): void {
  try {
    localStorage.removeItem(backupKey(saveUrl));
  } catch {
    /* 무시 */
  }
}
