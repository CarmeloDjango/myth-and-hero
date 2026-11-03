/**
 * 그리기 획 → 모양 (브라우저·서버 공용, DOM 의존 없음)
 * perfect-freehand로 필압이 반영된 외곽선을 만들고, SVG path 문자열로 바꿉니다.
 */
import { getStroke } from "perfect-freehand";

import type { Stroke } from "./rules";

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
  { key: "thin", label: "가늘게", size: 8 },
  { key: "mid", label: "보통", size: 16 },
  { key: "thick", label: "굵게", size: 32 },
] as const;

export function strokeOutline(s: Stroke, last = true) {
  return getStroke(s.points, {
    size: s.size,
    thinning: s.simulatePressure ? 0.5 : 0.65,
    smoothing: 0.5,
    streamline: 0.45,
    simulatePressure: s.simulatePressure,
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
