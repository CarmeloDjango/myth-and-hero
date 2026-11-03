"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

import { mirrorOp, renderAll, renderOp } from "@/lib/drawing/render";
import { BRUSH_TOOLS, CANVAS_SIZE, STAMP_SHAPES, type BrushTool, type StampShape, type Stroke } from "@/lib/heroes/rules";
import { BRUSHES, PEN_COLORS, PEN_SIZES, roundPoint, STAMP_SIZES, STAMPS } from "@/lib/heroes/strokes";

export type DrawingCanvasHandle = {
  /** 지금 그림을 PNG로 (1024×1024, 배경 투명. 채우기로 칠한 곳은 그 색) */
  exportPng: () => Promise<Blob | null>;
};

type Props = {
  initialStrokes: Stroke[];
  /** 그림 뒤에 깔리는 색 (진영 색). PNG에는 들어가지 않습니다. */
  background: string;
  onChange: (strokes: Stroke[]) => void;
};

type Tool = BrushTool | "fill" | "stamp";
type View = { scale: number; x: number; y: number };

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const RECENT_MAX = 6;

/**
 * 아이패드 + 애플 펜슬용 그리기 캔버스 (docs/HERO_MAKER.md 4-3)
 * - 붓 7가지(펜·크레용·마커·형광펜·반짝이·무지개·지우개), 채우기, 스탬프
 * - 거울 모드: 한쪽을 그리면 반대쪽도 똑같이
 * - 펜이 감지되면 손가락은 그리지 않고, 두 손가락으로 확대·이동만 합니다(손바닥 무시)
 * - 전체화면으로 크게 그리기
 * 그린 기록은 순서대로 저장되어 되돌리기·다시 보기에 씁니다.
 */
export const DrawingCanvas = forwardRef<DrawingCanvasHandle, Props>(function DrawingCanvas(
  { initialStrokes, background, onChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const committedRef = useRef<HTMLCanvasElement | null>(null);
  const currentRef = useRef<Stroke | null>(null);
  const drawingPointer = useRef<number | null>(null);
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; midX: number; midY: number; view: View } | null>(null);
  const pan = useRef<{ x: number; y: number; view: View } | null>(null);
  const frame = useRef<number | null>(null);

  const [ops, setOps] = useState<Stroke[]>(initialStrokes);
  // 되돌리기 단위: 한 번의 동작으로 추가된 기록 수 (거울 모드면 2개가 한 번)
  const [steps, setSteps] = useState<number[]>(() => initialStrokes.map(() => 1));
  const [redo, setRedo] = useState<Stroke[][]>([]);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(PEN_COLORS[0]);
  const [recent, setRecent] = useState<string[]>([]);
  const [size, setSize] = useState<number>(PEN_SIZES[2].size);
  const [stamp, setStamp] = useState<StampShape>("star");
  const [stampSize, setStampSize] = useState<number>(STAMP_SIZES[1].size);
  const [mirror, setMirror] = useState(false);
  const [penOnly, setPenOnly] = useState(false);
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false);

  /* ───────────── 그리기 ───────────── */

  const rebuildCommitted = useCallback((list: Stroke[]) => {
    const c = committedRef.current ?? document.createElement("canvas");
    committedRef.current = c;
    c.width = CANVAS_SIZE;
    c.height = CANVAS_SIZE;
    renderAll(c.getContext("2d", { willReadFrequently: true })!, list);
  }, []);

  const paint = useCallback(() => {
    frame.current = null;
    const canvas = canvasRef.current;
    if (!canvas || !committedRef.current) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.drawImage(committedRef.current, 0, 0);
    const cur = currentRef.current;
    if (cur) {
      // 그리는 중인 획은 보이는 캔버스에만 미리 그립니다 (거울 모드면 반대쪽도).
      // 보이는 캔버스에는 확정된 그림이 복사돼 있어서, 지우개(destination-out)도 그대로 미리 보입니다.
      renderOp(ctx, cur, false);
      if (mirror) renderOp(ctx, mirrorOp(cur), false);
    }
  }, [mirror]);

  const schedulePaint = useCallback(() => {
    frame.current ??= requestAnimationFrame(paint);
  }, [paint]);

  useEffect(() => {
    rebuildCommitted(ops);
    paint();
  }, [ops, rebuildCommitted, paint]);

  useImperativeHandle(ref, () => ({
    exportPng: () =>
      new Promise((resolve) => {
        const c = committedRef.current;
        if (!c) return resolve(null);
        c.toBlob((b) => resolve(b), "image/png");
      }),
  }));

  const commit = (added: Stroke[]) => {
    const next = [...ops, ...added];
    setOps(next);
    setSteps((s) => [...s, added.length]);
    setRedo([]);
    onChange(next);
  };

  const withMirror = (op: Stroke): Stroke[] => (mirror ? [op, mirrorOp(op)] : [op]);

  const toCanvasPoint = (e: { clientX: number; clientY: number; pointerType: string; pressure: number }) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
    const pressure = e.pointerType === "pen" ? e.pressure || 0.5 : 0.5;
    return roundPoint(x, y, pressure);
  };

  /* ───────────── 확대·이동 ───────────── */

  const clampView = useCallback((v: View): View => {
    const el = frameRef.current;
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale));
    if (!el) return { scale, x: 0, y: 0 };
    const w = el.clientWidth;
    const h = el.clientHeight;
    const minX = w - w * scale;
    const minY = h - h * scale;
    return { scale, x: Math.min(0, Math.max(minX, v.x)), y: Math.min(0, Math.max(minY, v.y)) };
  }, []);

  /** 화면의 한 점(cx, cy: 틀 기준)을 고정한 채로 배율 바꾸기 */
  const zoomAt = useCallback(
    (nextScale: number, cx: number, cy: number, base: View) => {
      const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
      const ratio = s / base.scale;
      return clampView({ scale: s, x: cx - (cx - base.x) * ratio, y: cy - (cy - base.y) * ratio });
    },
    [clampView],
  );

  const zoomBy = (factor: number) => {
    const el = frameRef.current;
    if (!el) return;
    setView((v) => zoomAt(v.scale * factor, el.clientWidth / 2, el.clientHeight / 2, v));
  };

  const frameXY = (clientX: number, clientY: number) => {
    const r = frameRef.current!.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  /* ───────────── 포인터 ───────────── */

  const cancelCurrent = () => {
    drawingPointer.current = null;
    currentRef.current = null;
    schedulePaint();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.pointerType === "pen" && !penOnly) setPenOnly(true);

    if (e.pointerType === "touch") {
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.current.size === 2) {
        // 두 손가락: 그리던 것을 취소하고 확대·이동
        cancelCurrent();
        pan.current = null;
        const [a, b] = [...touches.current.values()];
        const mid = frameXY((a.x + b.x) / 2, (a.y + b.y) / 2);
        gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), midX: mid.x, midY: mid.y, view };
        return;
      }
      if (touches.current.size > 2) return;
      if (penOnly) {
        // 펜으로 그리는 중에는 손가락 하나로 화면만 옮깁니다 (확대했을 때).
        if (view.scale > 1) pan.current = { x: e.clientX, y: e.clientY, view };
        return;
      }
    }

    if (drawingPointer.current !== null) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 이미 끝난 포인터를 잡으려 하면 오류가 나는 브라우저가 있습니다. 잡지 못해도 그리기는 됩니다.
    }

    const [x, y] = toCanvasPoint(e);
    if (tool === "fill") {
      commit(withMirror({ tool: "fill", color, x, y }));
      return;
    }
    if (tool === "stamp") {
      const rotation = Math.round((Math.random() - 0.5) * 30);
      commit(withMirror({ tool: "stamp", shape: stamp, color, x, y, size: stampSize, rotation }));
      return;
    }
    drawingPointer.current = e.pointerId;
    currentRef.current = {
      tool,
      color: tool === "eraser" ? "#000000" : color,
      size,
      simulatePressure: e.pointerType !== "pen",
      points: [toCanvasPoint(e)],
    };
    schedulePaint();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "touch" && touches.current.has(e.pointerId)) {
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const g = gesture.current;
      if (g && touches.current.size >= 2) {
        const [a, b] = [...touches.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = frameXY((a.x + b.x) / 2, (a.y + b.y) / 2);
        const zoomed = zoomAt(g.view.scale * (dist / Math.max(1, g.dist)), g.midX, g.midY, g.view);
        setView(clampView({ ...zoomed, x: zoomed.x + (mid.x - g.midX), y: zoomed.y + (mid.y - g.midY) }));
        return;
      }
      const p = pan.current;
      if (p) {
        setView(clampView({ ...p.view, x: p.view.x + (e.clientX - p.x), y: p.view.y + (e.clientY - p.y) }));
        return;
      }
    }
    if (e.pointerId !== drawingPointer.current) return;
    const cur = currentRef.current;
    if (!cur || !("points" in cur)) return;
    e.preventDefault();
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const ev of events.length ? events : [e.nativeEvent]) cur.points.push(toCanvasPoint(ev));
    schedulePaint();
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "touch") {
      touches.current.delete(e.pointerId);
      if (touches.current.size < 2) gesture.current = null;
      if (touches.current.size === 0) pan.current = null;
    }
    if (e.pointerId !== drawingPointer.current) return;
    drawingPointer.current = null;
    const done = currentRef.current;
    currentRef.current = null;
    if (done) commit(withMirror(done));
  };

  /* ───────────── 되돌리기 ───────────── */

  const undo = () => {
    const n = steps[steps.length - 1];
    if (!n) return;
    const removed = ops.slice(ops.length - n);
    const next = ops.slice(0, ops.length - n);
    setOps(next);
    setSteps((s) => s.slice(0, -1));
    setRedo((r) => [...r, removed]);
    onChange(next);
  };

  const redoOne = () => {
    const batch = redo[redo.length - 1];
    if (!batch) return;
    const next = [...ops, ...batch];
    setOps(next);
    setSteps((s) => [...s, batch.length]);
    setRedo((r) => r.slice(0, -1));
    onChange(next);
  };

  const clearAll = () => {
    if (!ops.length || !window.confirm("그림을 모두 지울까요?")) return;
    setOps([]);
    setSteps([]);
    setRedo([]);
    onChange([]);
  };

  /* ───────────── 색 ───────────── */

  const pickColor = (c: string, remember = false) => {
    setColor(c);
    if (tool === "eraser") setTool("pen");
    if (remember) setRecent((r) => [c, ...r.filter((x) => x !== c)].slice(0, RECENT_MAX));
  };

  /* ───────────── 전체화면 ───────────── */

  /** 전체화면 닫기: 화면 배치와 브라우저 전체화면을 함께 끕니다. */
  const closeFullscreen = useCallback(() => {
    setFullscreen(false);
    setView({ scale: 1, x: 0, y: 0 });
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen, closeFullscreen]);

  // 화면 크기가 바뀌면(전체화면 전환, 가로·세로 회전) 확대 상태를 다시 맞춥니다.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setView((v) => clampView(v)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [clampView]);

  const toggleFullscreen = async () => {
    if (fullscreen) {
      closeFullscreen();
      return;
    }
    setFullscreen(true);
    setView({ scale: 1, x: 0, y: 0 });
    // 브라우저 전체화면도 시도합니다 (안 되는 기기에서는 화면을 가득 채우는 것으로 충분).
    try {
      if (rootRef.current?.requestFullscreen && !document.fullscreenElement) await rootRef.current.requestFullscreen();
    } catch {
      // 무시
    }
  };

  useEffect(() => {
    const onChangeFs = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onChangeFs);
    return () => document.removeEventListener("fullscreenchange", onChangeFs);
  }, []);

  /* ───────────── 화면 ───────────── */

  const isBrush = (BRUSH_TOOLS as readonly string[]).includes(tool);

  return (
    <div
      ref={rootRef}
      data-fullscreen={fullscreen || undefined}
      className={
        fullscreen
          ? "fixed inset-0 z-50 flex flex-col items-center gap-3 overflow-y-auto bg-paper p-3 landscape:flex-row landscape:items-start landscape:justify-center"
          : "flex flex-col gap-3"
      }
    >
      <div
        ref={frameRef}
        className={`sticker relative mx-auto aspect-square w-full shrink-0 overflow-hidden rounded-card ${
          fullscreen ? "max-w-[min(100vw-24px,100dvh-24px)] landscape:max-w-[calc(100dvh-24px)]" : "max-w-[640px]"
        }`}
        style={{ background }}
      >
        <div
          className="absolute inset-0 origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            role="img"
            aria-label={`그림판. 그린 것 ${ops.length}개`}
            data-strokes={ops.length}
            data-scale={view.scale}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onContextMenu={(e) => e.preventDefault()}
            className="absolute inset-0 h-full w-full cursor-crosshair touch-none select-none [-webkit-touch-callout:none] [-webkit-user-select:none]"
          />
          {mirror ? (
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 w-0 border-l-2 border-dashed border-blue/60" />
          ) : null}
        </div>
        {view.scale > 1 ? (
          <span className="pointer-events-none absolute right-2 top-2 rounded-button bg-paper/90 px-2 py-0.5 text-xs font-bold text-muted">
            {Math.round(view.scale * 100)}%
          </span>
        ) : null}
      </div>

      <div className={`flex w-full flex-col gap-2.5 ${fullscreen ? "max-w-[640px] landscape:w-[360px] landscape:max-w-[360px]" : ""}`}>
        {/* 도구 */}
        <Row label="도구">
          {BRUSH_TOOLS.filter((t) => t !== "eraser").map((t) => (
            <ToolButton key={t} pressed={tool === t} onClick={() => setTool(t)}>
              <BrushSwatch tool={t} color={color} />
              {BRUSHES[t].label}
            </ToolButton>
          ))}
          <ToolButton pressed={tool === "fill"} onClick={() => setTool("fill")}>
            <FillIcon />
            채우기
          </ToolButton>
          <ToolButton pressed={tool === "stamp"} onClick={() => setTool("stamp")}>
            <span aria-hidden="true" className="text-lg leading-none">★</span>
            스탬프
          </ToolButton>
          <ToolButton pressed={tool === "eraser"} onClick={() => setTool("eraser")}>
            지우개
          </ToolButton>
        </Row>

        {/* 스탬프 모양 또는 굵기 */}
        {tool === "stamp" ? (
          <Row label="스탬프 모양">
            {STAMP_SHAPES.map((s) => (
              <ToolButton key={s} pressed={stamp === s} onClick={() => setStamp(s)} label={STAMPS[s].label}>
                <StampPreview shape={s} color={color} />
              </ToolButton>
            ))}
            <Divider />
            {STAMP_SIZES.map((s) => (
              <ToolButton key={s.key} pressed={stampSize === s.size} onClick={() => setStampSize(s.size)}>
                {s.label}
              </ToolButton>
            ))}
          </Row>
        ) : isBrush ? (
          <Row label="굵기">
            {PEN_SIZES.map((s) => (
              <ToolButton key={s.key} pressed={size === s.size} onClick={() => setSize(s.size)} label={`굵기 ${s.label}`}>
                <span aria-hidden="true" className="rounded-full bg-ink" style={{ width: Math.min(28, s.size / 2 + 3), height: Math.min(28, s.size / 2 + 3) }} />
              </ToolButton>
            ))}
          </Row>
        ) : null}

        {/* 색 */}
        <div className="flex flex-wrap items-center justify-center gap-2" role="radiogroup" aria-label="색">
          {[...PEN_COLORS, ...recent.filter((c) => !(PEN_COLORS as readonly string[]).includes(c))].map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c && tool !== "eraser"}
              aria-label={`색 ${c}`}
              onClick={() => pickColor(c)}
              className={`size-11 rounded-full border-2 ${color === c && tool !== "eraser" ? "border-ink ring-4 ring-blue" : "border-line"}`}
              style={{ background: c }}
            />
          ))}
          <label
            className="sticker pressable relative inline-flex min-h-11 cursor-pointer items-center gap-1.5 overflow-hidden rounded-button bg-paper px-3 text-[15px] font-bold text-blue-ink"
            title="더 많은 색"
          >
            <span aria-hidden="true" className="size-6 rounded-full border-2 border-line" style={{ background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }} />
            더 많은 색
            <input
              type="color"
              value={color}
              onChange={(e) => pickColor(e.target.value.toLowerCase(), true)}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="더 많은 색 고르기"
            />
          </label>
        </div>

        {/* 거울, 되돌리기, 확대, 전체화면 */}
        <Row label="기능">
          <ToolButton pressed={mirror} onClick={() => setMirror((m) => !m)}>
            <MirrorIcon />
            거울
          </ToolButton>
          <Divider />
          <ToolButton onClick={undo} disabled={!steps.length}>
            되돌리기
          </ToolButton>
          <ToolButton onClick={redoOne} disabled={!redo.length}>
            다시하기
          </ToolButton>
          <ToolButton onClick={clearAll} disabled={!ops.length}>
            모두 지우기
          </ToolButton>
          <Divider />
          <ToolButton onClick={() => zoomBy(1.5)} disabled={view.scale >= MAX_SCALE} label="확대">
            ＋
          </ToolButton>
          <ToolButton onClick={() => zoomBy(1 / 1.5)} disabled={view.scale <= MIN_SCALE} label="축소">
            －
          </ToolButton>
          <ToolButton onClick={() => setView({ scale: 1, x: 0, y: 0 })} disabled={view.scale === 1} label="화면에 맞추기">
            맞추기
          </ToolButton>
          <Divider />
          <ToolButton pressed={fullscreen} onClick={toggleFullscreen}>
            <FullscreenIcon on={fullscreen} />
            {fullscreen ? "작게 보기" : "크게 그리기"}
          </ToolButton>
        </Row>

        <p className="text-center text-sm font-bold text-muted">
          {penOnly ? (
            <>
              펜슬로 그리는 중이에요. 손가락 두 개로 벌리면 확대, 밀면 이동해요.{" "}
              <button type="button" onClick={() => setPenOnly(false)} className="text-blue-ink underline underline-offset-4">
                손가락으로도 그리기
              </button>
            </>
          ) : (
            "손가락 두 개로 벌리면 확대, 밀면 이동해요."
          )}
        </p>
      </div>
    </div>
  );
});

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2" role="toolbar" aria-label={label}>
      {children}
    </div>
  );
}

function Divider() {
  return <span className="mx-0.5 h-8 w-0.5 bg-line" aria-hidden="true" />;
}

function ToolButton({
  pressed,
  onClick,
  disabled,
  label,
  children,
}: {
  pressed?: boolean;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`pressable inline-flex min-h-12 min-w-12 items-center justify-center gap-1.5 rounded-button border-2 border-b-4 px-3 text-[15px] font-bold disabled:opacity-40 ${
        pressed ? "border-blue bg-blue-soft text-blue-ink" : "border-line bg-paper text-muted hover:bg-paper-dim"
      }`}
    >
      {children}
    </button>
  );
}

/** 붓 미리보기 점 */
function BrushSwatch({ tool, color }: { tool: BrushTool; color: string }) {
  const style: React.CSSProperties =
    tool === "rainbow"
      ? { background: "linear-gradient(90deg, #ff4b4b, #ffc800, #58cc02, #1cb0f6, #ce82ff)" }
      : tool === "glitter"
        ? { background: color, boxShadow: "inset 0 0 0 3px #fff8" }
        : { background: color, opacity: BRUSHES[tool].alpha < 1 ? Math.max(0.45, BRUSHES[tool].alpha) : 1 };
  return <span aria-hidden="true" className="inline-block h-3 w-5 rounded-full border border-line" style={style} />;
}

function StampPreview({ shape, color }: { shape: StampShape; color: string }) {
  if (shape === "flower") {
    return (
      <svg aria-hidden="true" viewBox="0 0 100 100" width="26" height="26">
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return <circle key={i} cx={50 + Math.cos(a) * 26} cy={50 + Math.sin(a) * 26} r="18" fill={color} stroke="#4b4b4b" strokeWidth="5" />;
        })}
        <circle cx="50" cy="50" r="15" fill="#ffc800" stroke="#4b4b4b" strokeWidth="5" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" width="26" height="26">
      <path d={STAMPS[shape].path} fill={color} stroke="#4b4b4b" strokeWidth="6" strokeLinejoin="round" />
    </svg>
  );
}

function FillIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
      <path d="M5 11 L12 4 L19 11 L12 18 Z" />
      <path d="M20 15 C 21.5 17, 21.5 19, 20 19.5 C 18.5 19, 18.5 17, 20 15 Z" fill="currentColor" />
    </svg>
  );
}

function MirrorIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 V21" strokeDasharray="2 3" />
      <path d="M9 7 L4 12 L9 17 Z" />
      <path d="M15 7 L20 12 L15 17 Z" />
    </svg>
  );
}

function FullscreenIcon({ on }: { on: boolean }) {
  return on ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4 V9 H4 M15 4 V9 H20 M9 20 V15 H4 M15 20 V15 H20" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9 V4 H9 M20 9 V4 H15 M4 15 V20 H9 M20 15 V20 H15" />
    </svg>
  );
}
