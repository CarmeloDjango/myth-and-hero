"use client";

import { useEffect, useRef, useState } from "react";

import { renderOp } from "@/lib/drawing/render";
import { CANVAS_SIZE, isBrushOp, type Stroke } from "@/lib/heroes/rules";

/** 기록 하나의 "길이" (재생 시간 배분용). 채우기·스탬프는 짧게 */
const unitsOf = (op: Stroke) => (isBrushOp(op) ? op.points.length : 10);

/**
 * 그린 과정 다시 보기 (타임랩스)
 * 저장된 그리기 기록을 순서대로, 붓 획은 점 단위로 조금씩 그려서 보여줍니다.
 */
/** source: 그림 라우트 주소 (/api/heroes/:id/drawing, /api/characters/:id/picture) */
export function DrawingReplay({ source, name, background }: { source: string; name: string; background: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="sticker pressable inline-flex min-h-14 items-center gap-2 rounded-button bg-paper px-6 text-[17px] font-bold tracking-[0.053em] text-blue-ink hover:bg-paper-dim"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round">
          <path d="M7 5 L19 12 L7 19 Z" fill="currentColor" />
        </svg>
        그린 과정 보기
      </button>
      {open ? <ReplayDialog source={source} name={name} background={background} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ReplayDialog({ source, name, background, onClose }: { source: string; name: string; background: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ops, setOps] = useState<Stroke[] | null>(null);
  /** 밑그림 사진 (있으면 사진을 먼저 깔고, 채우기는 사진의 선도 경계로 봄) */
  const [under, setUnder] = useState<{ src: string; img: HTMLImageElement } | null>(null);
  const [error, setError] = useState(false);
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`${source}?strokes=1`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(async (d: { strokes: Stroke[]; background?: string | null }) => {
        if (d.background) {
          const img = new Image();
          img.src = d.background;
          await img.decode().catch(() => {});
          if (alive) setUnder({ src: d.background, img });
        }
        if (alive) setOps(d.strokes);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [source]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 재생: 전체를 3~12초에 나눠 그립니다.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!ops || !canvas) return;
    const ctx = canvas.getContext("2d")!;
    const finished = document.createElement("canvas");
    finished.width = finished.height = CANVAS_SIZE;
    const fctx = finished.getContext("2d", { willReadFrequently: true })!;

    const total = ops.reduce((s, op) => s + unitsOf(op), 0);
    const durationMs = Math.min(12000, Math.max(3000, total * 4));
    const start = performance.now();
    let opIndex = 0;
    let consumed = 0; // 끝난 기록들의 길이 합
    let raf = 0;

    const tick = (now: number) => {
      const target = Math.min(total, ((now - start) / durationMs) * total);
      // 다 그린 기록은 완성 캔버스로 옮깁니다.
      while (opIndex < ops.length && consumed + unitsOf(ops[opIndex]) <= target) {
        renderOp(fctx, ops[opIndex], true, under?.img);
        consumed += unitsOf(ops[opIndex]);
        opIndex++;
      }
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.drawImage(finished, 0, 0);
      const cur = ops[opIndex];
      if (cur && isBrushOp(cur)) {
        const n = Math.max(1, Math.floor(target - consumed));
        renderOp(ctx, { ...cur, points: cur.points.slice(0, n) }, false);
      }
      if (opIndex < ops.length) raf = requestAnimationFrame(tick);
      else setDone(true);
    };
    setDone(false);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ops, run, under]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name} 그린 과정`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex w-full max-w-[640px] flex-col gap-4 rounded-card bg-paper p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-3xl">{name} 그린 과정</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="sticker pressable size-12 rounded-button bg-paper text-2xl font-bold text-muted">
            ✕
          </button>
        </div>
        <div className="relative aspect-square w-full overflow-hidden rounded-card border-2 border-line" style={{ background }}>
          {under ? (
            // eslint-disable-next-line @next/next/no-img-element -- 가족 전용 비공개 사진
            <img src={under.src} alt="" className="absolute inset-0 h-full w-full bg-paper" />
          ) : null}
          <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} data-replay-done={done || undefined} className="absolute inset-0 h-full w-full" />
          {!ops && !error ? (
            <p role="status" className="absolute inset-0 flex items-center justify-center font-bold text-muted">
              불러오는 중…
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="absolute inset-0 flex items-center justify-center font-bold text-muted">
              그린 과정을 불러오지 못했어요.
            </p>
          ) : null}
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            disabled={!done}
            onClick={() => setRun((r) => r + 1)}
            className="pressable inline-flex min-h-14 items-center rounded-button border-b-4 border-green-dark bg-green px-6 text-[17px] font-bold text-paper disabled:opacity-50"
          >
            {done ? "다시 보기" : "그리는 중…"}
          </button>
        </div>
      </div>
    </div>
  );
}
