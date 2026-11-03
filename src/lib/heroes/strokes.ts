/**
 * 그리기 도구 정의와 획 → 모양 계산 (브라우저·서버 공용, DOM 의존 없음)
 * perfect-freehand로 필압이 반영된 외곽선을 만들고, SVG path 문자열로 바꿉니다.
 */
import { getStroke } from "perfect-freehand";

import type { BrushOp, BrushTool, StampShape } from "./rules";

export const PEN_COLORS = [
  "#4b4b4b", // 먹색
  "#ff4b4b", // 빨강
  "#ff9600", // 주황
  "#ffc800", // 노랑
  "#58cc02", // 초록
  "#1cb0f6", // 파랑
  "#3f51d6", // 남색
  "#ce82ff", // 보라
  "#ff86d0", // 분홍
  "#a0673c", // 갈색
  "#afafaf", // 회색
  "#ffffff", // 흰색
] as const;

export const PEN_SIZES = [
  { key: "xs", label: "아주 가늘게", size: 4 },
  { key: "thin", label: "가늘게", size: 8 },
  { key: "mid", label: "보통", size: 16 },
  { key: "thick", label: "굵게", size: 32 },
  { key: "xl", label: "아주 굵게", size: 56 },
] as const;

/** 붓마다 다른 느낌 (필압 반영 정도, 투명도, 섞는 방식) */
export const BRUSHES: Record<
  BrushTool,
  { label: string; thinning: number; sizeScale: number; alpha: number; composite: GlobalCompositeOperation; taper: boolean }
> = {
  pen: { label: "펜", thinning: 0.65, sizeScale: 1, alpha: 1, composite: "source-over", taper: true },
  crayon: { label: "크레용", thinning: 0.35, sizeScale: 1.3, alpha: 0.95, composite: "source-over", taper: false },
  marker: { label: "마커", thinning: 0.1, sizeScale: 1.4, alpha: 0.55, composite: "multiply", taper: false },
  highlighter: { label: "형광펜", thinning: 0, sizeScale: 2.2, alpha: 0.35, composite: "multiply", taper: false },
  glitter: { label: "반짝이", thinning: 0.5, sizeScale: 1.1, alpha: 1, composite: "source-over", taper: true },
  rainbow: { label: "무지개", thinning: 0.5, sizeScale: 1, alpha: 1, composite: "source-over", taper: false },
  eraser: { label: "지우개", thinning: 0, sizeScale: 1.6, alpha: 1, composite: "destination-out", taper: false },
};

export function strokeOutline(s: BrushOp, last = true) {
  const b = BRUSHES[s.tool];
  return getStroke(s.points, {
    size: s.size * b.sizeScale,
    thinning: s.simulatePressure ? b.thinning * 0.8 : b.thinning,
    smoothing: 0.5,
    streamline: 0.45,
    simulatePressure: s.simulatePressure && b.thinning > 0,
    start: { taper: b.taper ? 0 : false, cap: true },
    end: { taper: b.taper ? 0 : false, cap: true },
    last,
  });
}

/** 외곽선 점들 → 부드러운 SVG path (2차 곡선) */
export function outlineToSvgPath(points: number[][]): string {
  if (points.length < 2) {
    if (points.length === 1) {
      const [x, y] = points[0];
      return `M ${x} ${y} l 0.01 0`;
    }
    return "";
  }
  const avg = (a: number, b: number) => ((a + b) / 2).toFixed(1);
  const [first, second] = points;
  let d = `M ${first[0].toFixed(1)} ${first[1].toFixed(1)} Q ${second[0].toFixed(1)} ${second[1].toFixed(1)} ${avg(second[0], points[2]?.[0] ?? second[0])} ${avg(second[1], points[2]?.[1] ?? second[1])} T`;
  for (let i = 2; i < points.length - 1; i++) {
    d += ` ${avg(points[i][0], points[i + 1][0])} ${avg(points[i][1], points[i + 1][1])}`;
  }
  return `${d} Z`;
}

/** 좌표를 소수 한 자리로 줄여 저장 용량을 아낍니다. */
export function roundPoint(x: number, y: number, pressure: number): [number, number, number] {
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(pressure * 100) / 100];
}

/** 스탬프 모양: 100×100 상자 기준 SVG path. flower는 그리기 함수에서 따로 그립니다. */
export const STAMPS: Record<StampShape, { label: string; path: string }> = {
  star: { label: "별", path: "M50 5 L61 38 L96 38 L68 59 L79 93 L50 72 L21 93 L32 59 L4 38 L39 38 Z" },
  heart: { label: "하트", path: "M50 88 C 20 66, 5 48, 5 30 A 22 22 0 0 1 50 22 A 22 22 0 0 1 95 30 C 95 48, 80 66, 50 88 Z" },
  bolt: { label: "번개", path: "M58 4 L18 56 L46 56 L38 96 L82 40 L54 40 L64 4 Z" },
  crown: { label: "왕관", path: "M8 80 L14 26 L34 52 L50 16 L66 52 L86 26 L92 80 Z" },
  sword: { label: "칼", path: "M46 4 L54 4 L57 60 L50 68 L43 60 Z M28 60 L72 60 L72 69 L28 69 Z M45 69 L55 69 L55 88 L45 88 Z M41 88 L59 88 L59 96 L41 96 Z" },
  shield: { label: "방패", path: "M50 6 L88 18 C 88 58, 74 82, 50 94 C 26 82, 12 58, 12 18 Z" },
  flame: { label: "불꽃", path: "M50 4 C 62 26, 84 38, 82 64 C 80 84, 64 96, 50 96 C 32 96, 18 84, 18 64 C 18 50, 28 40, 34 30 C 36 44, 42 50, 48 52 C 44 36, 46 20, 50 4 Z" },
  flower: { label: "꽃", path: "" },
  moon: { label: "달", path: "M62 8 A 44 44 0 1 0 92 70 A 36 36 0 1 1 62 8 Z" },
  gem: { label: "보석", path: "M30 10 L70 10 L92 36 L50 94 L8 36 Z M8 36 L92 36" },
};

export const STAMP_SIZES = [
  { key: "s", label: "작게", size: 80 },
  { key: "m", label: "보통", size: 160 },
  { key: "l", label: "크게", size: 280 },
] as const;
