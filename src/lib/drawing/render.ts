/**
 * 그리기 기록 → 캔버스 (브라우저 전용: Canvas 2D API 사용)
 * 그리기 화면, 되돌리기, "그린 과정 다시 보기"가 모두 이 함수로 그립니다.
 */
import { BRUSHES, outlineToSvgPath, STAMPS, strokeOutline } from "@/lib/heroes/strokes";
import { CANVAS_SIZE, isBrushOp, type BrushOp, type FillOp, type StampOp, type Stroke } from "@/lib/heroes/rules";

/** 같은 획은 언제 그려도 같은 반짝이가 나오도록 하는 난수 (mulberry32) */
function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedOf(op: BrushOp): number {
  const [x, y] = op.points[0];
  return Math.floor(x * 7919 + y * 104729 + op.points.length * 31);
}

/** 크레용 질감: 색마다 한 번 만든 점무늬 패턴을 다시 씁니다. */
const crayonPatterns = new Map<string, CanvasPattern | null>();
function crayonPattern(ctx: CanvasRenderingContext2D, color: string): CanvasPattern | string {
  if (!crayonPatterns.has(color)) {
    const c = document.createElement("canvas");
    c.width = c.height = 48;
    const p = c.getContext("2d")!;
    p.fillStyle = color;
    p.fillRect(0, 0, 48, 48);
    const rnd = seededRandom(42);
    p.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 260; i++) {
      p.globalAlpha = 0.25 + rnd() * 0.6;
      p.fillRect(Math.floor(rnd() * 48), Math.floor(rnd() * 48), 1 + Math.floor(rnd() * 2), 1);
    }
    crayonPatterns.set(color, ctx.createPattern(c, "repeat"));
  }
  return crayonPatterns.get(color) ?? color;
}

function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

function drawRainbow(ctx: CanvasRenderingContext2D, op: BrushOp) {
  const pts = op.points;
  const width = op.size * BRUSHES.rainbow.sizeScale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  let travelled = 0;
  if (pts.length === 1) {
    ctx.fillStyle = "hsl(0 90% 55%)";
    ctx.beginPath();
    ctx.arc(pts[0][0], pts[0][1], width / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0, p0] = pts[i - 1];
    const [x1, y1, p1] = pts[i];
    travelled += Math.hypot(x1 - x0, y1 - y0);
    const pressure = op.simulatePressure ? 0.6 : (p0 + p1) / 2;
    ctx.strokeStyle = `hsl(${Math.round((travelled / 4) % 360)} 90% 55%)`;
    ctx.lineWidth = Math.max(2, width * (0.4 + pressure));
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
}

function drawBrush(ctx: CanvasRenderingContext2D, op: BrushOp, last: boolean) {
  const b = BRUSHES[op.tool];
  ctx.save();
  ctx.globalCompositeOperation = b.composite;
  ctx.globalAlpha = b.alpha;
  if (op.tool === "rainbow") {
    drawRainbow(ctx, op);
    ctx.restore();
    return;
  }
  const path = new Path2D(outlineToSvgPath(strokeOutline(op, last)));
  ctx.fillStyle = op.tool === "eraser" ? "#000" : op.tool === "crayon" ? crayonPattern(ctx, op.color) : op.color;
  ctx.fill(path);

  if (op.tool === "glitter") {
    // 선을 따라 하얀색·금색 반짝이를 뿌립니다.
    const rnd = seededRandom(seedOf(op));
    const step = Math.max(6, op.size * 0.8);
    let acc = 0;
    for (let i = 1; i < op.points.length; i++) {
      const [x0, y0] = op.points[i - 1];
      const [x1, y1] = op.points[i];
      acc += Math.hypot(x1 - x0, y1 - y0);
      while (acc >= step) {
        acc -= step;
        const spread = op.size * 0.9;
        ctx.fillStyle = rnd() < 0.5 ? "#ffffff" : "#ffd84a";
        drawSparkle(ctx, x1 + (rnd() - 0.5) * spread, y1 + (rnd() - 0.5) * spread, 2 + rnd() * op.size * 0.35);
      }
    }
  }
  ctx.restore();
}

function drawStamp(ctx: CanvasRenderingContext2D, op: StampOp) {
  ctx.save();
  ctx.translate(op.x, op.y);
  ctx.rotate((op.rotation * Math.PI) / 180);
  ctx.scale(op.size / 100, op.size / 100);
  ctx.translate(-50, -50);
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#4b4b4b";
  ctx.fillStyle = op.color;
  if (op.shape === "flower") {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(50 + Math.cos(a) * 26, 50 + Math.sin(a) * 26, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = "#ffc800";
    ctx.beginPath();
    ctx.arc(50, 50, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    const path = new Path2D(STAMPS[op.shape].path);
    ctx.fill(path);
    ctx.stroke(path);
  }
  ctx.restore();
}

function parseHex(color: string): [number, number, number] {
  const n = parseInt(color.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * 채우기: (x, y)와 이어진 비슷한 색 영역을 칠합니다 (스캔라인 방식).
 * 선 가장자리의 반투명 픽셀은 채운 색과 섞어서, 칠한 경계에 흰 틈이 남지 않게 합니다.
 */
export function floodFill(ctx: CanvasRenderingContext2D, op: FillOp, tolerance = 48) {
  const W = CANVAS_SIZE;
  const H = CANVAS_SIZE;
  const sx = Math.floor(op.x);
  const sy = Math.floor(op.y);
  if (sx < 0 || sy < 0 || sx >= W || sy >= H) return;
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const at = (x: number, y: number) => (y * W + x) * 4;
  const s = at(sx, sy);
  const target = [d[s], d[s + 1], d[s + 2], d[s + 3]];
  const [fr, fg, fb] = parseHex(op.color);
  if (target[3] === 255 && Math.abs(target[0] - fr) + Math.abs(target[1] - fg) + Math.abs(target[2] - fb) < 6) return;

  const matches = (i: number) => {
    // 투명한 곳은 투명한 곳끼리만 이어지게 비교합니다.
    if (target[3] < 32) return d[i + 3] < 32;
    return (
      Math.abs(d[i] - target[0]) + Math.abs(d[i + 1] - target[1]) + Math.abs(d[i + 2] - target[2]) + Math.abs(d[i + 3] - target[3]) <=
      tolerance * 2
    );
  };

  const filled = new Uint8Array(W * H);
  const stack: number[] = [sx, sy];
  while (stack.length) {
    const y = stack.pop()!;
    let x = stack.pop()!;
    while (x >= 0 && !filled[y * W + x] && matches(at(x, y))) x--;
    x++;
    let up = false;
    let down = false;
    while (x < W && !filled[y * W + x] && matches(at(x, y))) {
      filled[y * W + x] = 1;
      if (y > 0) {
        const m = !filled[(y - 1) * W + x] && matches(at(x, y - 1));
        if (m && !up) stack.push(x, y - 1);
        up = m;
      }
      if (y < H - 1) {
        const m = !filled[(y + 1) * W + x] && matches(at(x, y + 1));
        if (m && !down) stack.push(x, y + 1);
        down = m;
      }
      x++;
    }
  }

  for (let p = 0; p < W * H; p++) {
    if (!filled[p]) continue;
    const i = p * 4;
    d[i] = fr;
    d[i + 1] = fg;
    d[i + 2] = fb;
    d[i + 3] = 255;
  }
  // 가장자리 1픽셀: 반투명 선 픽셀 밑에 채운 색을 깔아 섞습니다.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (filled[p]) continue;
      const near =
        (x > 0 && filled[p - 1]) || (x < W - 1 && filled[p + 1]) || (y > 0 && filled[p - W]) || (y < H - 1 && filled[p + W]);
      if (!near) continue;
      const i = p * 4;
      const a = d[i + 3] / 255;
      if (a >= 0.98) continue;
      d[i] = Math.round(d[i] * a + fr * (1 - a));
      d[i + 1] = Math.round(d[i + 1] * a + fg * (1 - a));
      d[i + 2] = Math.round(d[i + 2] * a + fb * (1 - a));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** 기록 하나 그리기. last=false면 그리는 중인 획(끝이 아직 열려 있음) */
export function renderOp(ctx: CanvasRenderingContext2D, op: Stroke, last = true) {
  if (isBrushOp(op)) drawBrush(ctx, op, last);
  else if (op.tool === "stamp") drawStamp(ctx, op);
  else floodFill(ctx, op);
}

export function renderAll(ctx: CanvasRenderingContext2D, ops: Stroke[]) {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  for (const op of ops) renderOp(ctx, op, true);
}

/** 거울 모드: 가운데 세로선을 기준으로 뒤집은 기록 */
export function mirrorOp<T extends Stroke>(op: T): T {
  const flip = (x: number) => Math.round((CANVAS_SIZE - x) * 10) / 10;
  if (isBrushOp(op)) return { ...op, points: op.points.map(([x, y, p]) => [flip(x), y, p]) } as T;
  if (op.tool === "stamp") return { ...op, x: flip(op.x), rotation: -op.rotation } as T;
  return { ...op, x: flip(op.x) } as T;
}
