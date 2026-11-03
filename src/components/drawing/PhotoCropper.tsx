"use client";

import { useEffect, useRef, useState } from "react";

import { autoFrame, clampFrame, containFrame, coverFrame, edgeColor, type Frame, type Rgb } from "@/lib/drawing/crop";
import { CANVAS_SIZE, MAX_BACKGROUND_BYTES } from "@/lib/heroes/rules";

/** 분석용으로 줄인 사진 크기 (긴 쪽) */
const ANALYZE = 256;
/** 밑그림 사진 목표 용량: 화질을 조금씩 낮춰 이 안에 맞춥니다. */
const TARGET_BYTES = 350 * 1024;

function analyze(img: HTMLImageElement): { frame: Frame; bg: Rgb } {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const k = Math.min(1, ANALYZE / Math.max(w, h));
  const aw = Math.max(1, Math.round(w * k));
  const ah = Math.max(1, Math.round(h * k));
  const c = document.createElement("canvas");
  c.width = aw;
  c.height = ah;
  const x = c.getContext("2d", { willReadFrequently: true })!;
  x.drawImage(img, 0, 0, aw, ah);
  const px = x.getImageData(0, 0, aw, ah).data;
  c.width = c.height = 0; // 아이패드 캔버스 메모리 바로 돌려주기
  const bg = edgeColor(px, aw, ah);
  const f = autoFrame(px, aw, ah, bg);
  return { frame: clampFrame({ cx: f.cx / k, cy: f.cy / k, side: f.side / k }, w, h), bg };
}

/** 자른 사진 → 1024×1024 JPEG (남는 곳은 가장자리 색). 용량이 크면 화질을 낮춰 다시 */
export async function renderCrop(img: HTMLImageElement, frame: Frame, bg: Rgb): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = c.height = CANVAS_SIZE;
  const x = c.getContext("2d");
  if (!x) throw new Error("그림판 메모리가 부족해요. 화면을 새로고침해 주세요.");
  x.fillStyle = `rgb(${bg.join(",")})`;
  x.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  const k = CANVAS_SIZE / frame.side;
  x.imageSmoothingQuality = "high";
  x.drawImage(img, (frame.side / 2 - frame.cx) * k, (frame.side / 2 - frame.cy) * k, img.naturalWidth * k, img.naturalHeight * k);
  try {
    let last: Blob | null = null;
    for (const q of [0.85, 0.75, 0.65, 0.55]) {
      last = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", q));
      if (last && last.size <= TARGET_BYTES) return last;
    }
    if (last && last.size <= MAX_BACKGROUND_BYTES) return last;
    throw new Error(last ? "사진이 너무 커요." : "사진을 만들지 못했어요. 화면을 새로고침해 주세요.");
  } finally {
    c.width = c.height = 0; // 아이패드 캔버스 메모리 바로 돌려주기
  }
}

/**
 * 사진 맞추기: 올린 사진을 정사각형으로 자릅니다.
 * - 처음에는 "자동 맞춤"(종이 위 그림을 찾아 가운데로)
 * - 손가락·펜으로 끌어서 옮기고, 두 손가락이나 크기 막대로 키우고 줄임
 * - 사진 밖으로 나간 부분은 사진 가장자리 색(종이 색)으로 채워 흰 띠가 생기지 않음
 */
export function PhotoCropper({ img, onCancel, onConfirm }: { img: HTMLImageElement; onCancel: () => void; onConfirm: (blob: Blob) => void }) {
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const [{ auto, bg }] = useState(() => {
    const a = analyze(img);
    return { auto: a.frame, bg: a.bg };
  });
  const [frame, setFrame] = useState<Frame>(auto);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const view = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState(320);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ frame: Frame; dist: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const el = view.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setVp(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const minSide = Math.min(W, H) * 0.2;
  const maxSide = Math.max(W, H);
  const k = vp / frame.side;
  const set = (f: Frame) => setFrame(clampFrame(f, W, H));

  /** 크기 막대: 0(전체 보기) ~ 100(가장 크게), 로그 눈금 */
  const zoom = Math.round((Math.log(maxSide / frame.side) / Math.log(maxSide / minSide)) * 100);
  const setZoom = (z: number) => set({ ...frame, side: maxSide * Math.pow(minSide / maxSide, z / 100) });

  const startGesture = () => {
    const pts = [...pointers.current.values()];
    const mid = pts.reduce((m, p) => ({ x: m.x + p.x / pts.length, y: m.y + p.y / pts.length }), { x: 0, y: 0 });
    const dist = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    gesture.current = { frame, dist, ...mid };
  };

  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    startGesture();
  };
  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const pts = [...pointers.current.values()];
    const mid = pts.reduce((m, p) => ({ x: m.x + p.x / pts.length, y: m.y + p.y / pts.length }), { x: 0, y: 0 });
    const scale = pts.length > 1 && g.dist ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) / g.dist : 1;
    const side = g.frame.side / scale;
    const gk = vp / g.frame.side;
    // 끈 만큼 사진이 따라 움직이도록 (화면 → 사진 좌표)
    set({ cx: g.frame.cx - (mid.x - g.x) / gk, cy: g.frame.cy - (mid.y - g.y) / gk, side });
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size) startGesture();
    else gesture.current = null;
  };

  const confirm = async () => {
    setBusy(true);
    setError(undefined);
    try {
      onConfirm(await renderCrop(img, frame, bg));
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진을 만들지 못했어요.");
      setBusy(false);
    }
  };

  const chip = "sticker pressable min-h-11 rounded-button bg-paper px-3 text-[15px] font-bold text-blue-ink hover:bg-paper-dim";

  return (
    <div role="dialog" aria-modal="true" aria-label="사진 맞추기" className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/60 p-4">
      <div className="flex w-full max-w-[560px] flex-col gap-4 rounded-card bg-paper p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-3xl">사진 맞추기</h2>
          <button type="button" onClick={onCancel} aria-label="닫기" className="sticker pressable size-12 rounded-button bg-paper text-2xl font-bold text-muted">
            ✕
          </button>
        </div>
        <p className="text-[15px] font-medium text-muted">끌어서 옮기고, 두 손가락이나 아래 막대로 크기를 바꿔요.</p>
        <div
          ref={view}
          data-crop-view
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onWheel={(e) => set({ ...frame, side: frame.side * (e.deltaY > 0 ? 1.08 : 1 / 1.08) })}
          className="relative aspect-square w-full cursor-grab touch-none select-none overflow-hidden rounded-card border-2 border-line"
          style={{ background: `rgb(${bg.join(",")})` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 방금 고른 사진(blob:) */}
          <img
            src={img.src}
            alt="자를 사진"
            draggable={false}
            className="pointer-events-none absolute max-w-none"
            style={{ left: (frame.side / 2 - frame.cx) * k, top: (frame.side / 2 - frame.cy) * k, width: W * k, height: H * k }}
          />
        </div>
        <label className="flex items-center gap-3 font-bold">
          <span className="shrink-0 text-[15px]">크기</span>
          <input type="range" min={0} max={100} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="사진 크기" className="flex-1 accent-[var(--color-blue)]" />
        </label>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className={chip} onClick={() => set(auto)}>
            자동 맞춤
          </button>
          <button type="button" className={chip} onClick={() => set(coverFrame(W, H))}>
            꽉 채우기
          </button>
          <button type="button" className={chip} onClick={() => set(containFrame(W, H))}>
            전체 보기
          </button>
        </div>
        {error ? (
          <p role="alert" className="text-center text-sm font-bold text-[#b42318]">
            {error}
          </p>
        ) : null}
        <div className="flex justify-between gap-3">
          <button type="button" onClick={onCancel} className="sticker pressable min-h-14 rounded-button px-5 font-bold text-blue-ink hover:bg-paper-dim">
            그만두기
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={confirm}
            className="pressable inline-flex min-h-14 items-center rounded-button border-b-4 border-green-dark bg-green px-6 text-[17px] font-bold text-paper disabled:opacity-50"
          >
            {busy ? "만드는 중…" : "이대로 쓰기"}
          </button>
        </div>
      </div>
    </div>
  );
}
