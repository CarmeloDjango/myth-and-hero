/**
 * 사진 자르기 계산 (브라우저·테스트 공용, DOM 없음)
 *
 * 자르는 영역은 원본 사진 픽셀 기준의 정사각형 { cx, cy, side } 입니다.
 * 정사각형이 사진 밖으로 나가는 부분은 사진 가장자리 색(종이 색)으로 채워서 흰 띠가 생기지 않게 합니다.
 */
export type Frame = { cx: number; cy: number; side: number };
export type Rgb = [number, number, number];

/** 사진 가장자리(바깥 4%) 색의 중앙값 = 종이·배경 색 */
export function edgeColor(px: Uint8ClampedArray, w: number, h: number): Rgb {
  const band = Math.max(1, Math.round(Math.min(w, h) * 0.04));
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x >= band && x < w - band && y >= band && y < h - band) continue;
      const i = (y * w + x) * 4;
      rs.push(px[i]);
      gs.push(px[i + 1]);
      bs.push(px[i + 2]);
    }
  }
  const med = (a: number[]) => a.sort((p, q) => p - q)[a.length >> 1] ?? 255;
  return [med(rs), med(gs), med(bs)];
}

/** 사진을 꽉 채우는 가운데 정사각형 */
export function coverFrame(w: number, h: number): Frame {
  return { cx: w / 2, cy: h / 2, side: Math.min(w, h) };
}

/** 사진 전체가 보이는 정사각형 (남는 곳은 가장자리 색) */
export function containFrame(w: number, h: number): Frame {
  return { cx: w / 2, cy: h / 2, side: Math.max(w, h) };
}

/**
 * 자동 맞춤: 종이 위에 그린 그림처럼 배경과 다른 부분을 찾아, 그 부분이 가운데 오도록 정사각형을 잡습니다.
 * 찾지 못하면(사진 전체가 복잡하면) 가운데를 꽉 채웁니다.
 * px는 분석용으로 줄인 사진(w×h), 돌려주는 값도 같은 좌표입니다.
 */
export function autoFrame(px: Uint8ClampedArray, w: number, h: number, bg: Rgb = edgeColor(px, w, h)): Frame {
  const rows = new Array<number>(h).fill(0);
  const cols = new Array<number>(w).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (Math.abs(px[i] - bg[0]) + Math.abs(px[i + 1] - bg[1]) + Math.abs(px[i + 2] - bg[2]) > 90) {
        rows[y]++;
        cols[x]++;
      }
    }
  }
  // 점 몇 개(티끌, 그림자)는 무시: 줄마다 1% 넘게 다른 색이 있어야 그림으로 봅니다.
  const first = (a: number[], t: number) => a.findIndex((n) => n > t);
  const last = (a: number[], t: number) => a.length - 1 - [...a].reverse().findIndex((n) => n > t);
  const tRow = Math.max(1, w * 0.01);
  const tCol = Math.max(1, h * 0.01);
  const top = first(rows, tRow);
  const left = first(cols, tCol);
  if (top < 0 || left < 0) return coverFrame(w, h);
  const bottom = last(rows, tRow);
  const right = last(cols, tCol);
  const bw = right - left + 1;
  const bh = bottom - top + 1;
  // 그림이 거의 없거나, 사진 거의 전체가 그림이면 자동 맞춤이 의미 없음
  if (bw * bh < w * h * 0.01 || (bw > w * 0.95 && bh > h * 0.95)) return coverFrame(w, h);

  // 카드 칸은 가로가 더 길어서 위아래가 조금 잘리므로 여백을 넉넉히 둡니다.
  const side = Math.min(Math.max(bw, bh) * 1.3, Math.max(w, h));
  return clampFrame({ cx: left + bw / 2, cy: top + bh / 2, side }, w, h);
}

/** 정사각형이 사진에서 너무 벗어나지 않게: 가운데가 사진 안에 있고, 크기는 사진의 20%~전체 */
export function clampFrame(f: Frame, w: number, h: number): Frame {
  const side = Math.min(Math.max(f.side, Math.min(w, h) * 0.2), Math.max(w, h));
  // 사진보다 작은 방향은 사진 밖으로 나가지 않게, 큰 방향은 가운데로
  const fit = (c: number, len: number) => (side <= len ? Math.min(Math.max(c, side / 2), len - side / 2) : len / 2);
  return { cx: fit(f.cx, w), cy: fit(f.cy, h), side };
}
