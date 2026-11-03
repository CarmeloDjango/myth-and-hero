"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

import { CANVAS_SIZE, type Stroke } from "@/lib/heroes/rules";
import { outlineToSvgPath, PEN_COLORS, PEN_SIZES, roundPoint, strokeOutline } from "@/lib/heroes/strokes";

export type DrawingCanvasHandle = {
  /** 지금 그림을 투명 배경 PNG로 (1024×1024) */
  exportPng: () => Promise<Blob | null>;
};

type Props = {
  initialStrokes: Stroke[];
  /** 그림 뒤에 깔리는 색 (진영 색). PNG에는 들어가지 않습니다. */
  background: string;
  onChange: (strokes: Stroke[]) => void;
};

/**
 * 아이패드 + 애플 펜슬용 그리기 캔버스 (docs/HERO_MAKER.md 4-3)
 * - 펜 필압으로 굵기가 바뀝니다. 손가락·마우스는 속도로 필압을 흉내 냅니다.
 * - 펜이 한 번 감지되면 손바닥 터치를 무시합니다(펜 전용). 버튼으로 손가락 그리기를 다시 켤 수 있습니다.
 * - 획은 벡터로 저장해서 되돌리기·다시하기가 됩니다.
 */
export const DrawingCanvas = forwardRef<DrawingCanvasHandle, Props>(function DrawingCanvas(
  { initialStrokes, background, onChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const committedRef = useRef<HTMLCanvasElement | null>(null);
  const currentRef = useRef<Stroke | null>(null);
  const activePointer = useRef<number | null>(null);
  const frame = useRef<number | null>(null);

  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
  const [redo, setRedo] = useState<Stroke[]>([]);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState<string>(PEN_COLORS[0]);
  const [size, setSize] = useState<number>(PEN_SIZES[1].size);
  const [penOnly, setPenOnly] = useState(false);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, s: Stroke, last: boolean) => {
    const path = new Path2D(outlineToSvgPath(strokeOutline(s, last)));
    ctx.save();
    ctx.globalCompositeOperation = s.tool === "eraser" ? "destination-out" : "source-over";
    ctx.fillStyle = s.tool === "eraser" ? "#000" : s.color;
    ctx.fill(path);
    ctx.restore();
  }, []);

  /** 확정된 획을 따로 그려 둔 캔버스 (그리는 중에는 이 위에 지금 획만 얹습니다) */
  const rebuildCommitted = useCallback(
    (list: Stroke[]) => {
      const c = committedRef.current ?? document.createElement("canvas");
      committedRef.current = c;
      c.width = CANVAS_SIZE;
      c.height = CANVAS_SIZE;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      for (const s of list) drawStroke(ctx, s, true);
    },
    [drawStroke],
  );

  const paint = useCallback(() => {
    frame.current = null;
    const canvas = canvasRef.current;
    if (!canvas || !committedRef.current) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.drawImage(committedRef.current, 0, 0);
    if (currentRef.current) drawStroke(ctx, currentRef.current, false);
  }, [drawStroke]);

  const schedulePaint = useCallback(() => {
    frame.current ??= requestAnimationFrame(paint);
  }, [paint]);

  // 획 목록이 바뀌면(되돌리기 포함) 다시 그립니다.
  useEffect(() => {
    rebuildCommitted(strokes);
    paint();
  }, [strokes, rebuildCommitted, paint]);

  useImperativeHandle(ref, () => ({
    exportPng: () =>
      new Promise((resolve) => {
        const c = committedRef.current;
        if (!c) return resolve(null);
        c.toBlob((b) => resolve(b), "image/png");
      }),
  }));

  const commit = (next: Stroke[]) => {
    setStrokes(next);
    setRedo([]);
    onChange(next);
  };

  const toCanvasPoint = (e: PointerEvent | React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
    const pressure = e.pointerType === "pen" ? e.pressure || 0.5 : 0.5;
    return roundPoint(x, y, pressure);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "pen" && !penOnly) setPenOnly(true);
    if ((penOnly || e.pointerType === "pen") && e.pointerType === "touch") return; // 손바닥 무시
    if (activePointer.current !== null) return; // 두 번째 손가락 무시
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 일부 브라우저는 이미 끝난 포인터를 잡으려 하면 오류를 냅니다. 잡지 못해도 그리기는 계속됩니다.
    }
    activePointer.current = e.pointerId;
    currentRef.current = {
      tool,
      color: tool === "eraser" ? "#000000" : color,
      size: tool === "eraser" ? size * 1.6 : size,
      simulatePressure: e.pointerType !== "pen",
      points: [toCanvasPoint(e)],
    };
    schedulePaint();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerId !== activePointer.current || !currentRef.current) return;
    e.preventDefault();
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    for (const ev of events.length ? events : [e.nativeEvent]) currentRef.current.points.push(toCanvasPoint(ev));
    schedulePaint();
  };

  const endStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerId !== activePointer.current) return;
    activePointer.current = null;
    const done = currentRef.current;
    currentRef.current = null;
    if (done && done.points.length) commit([...strokes, done]);
  };

  const undo = () => {
    if (!strokes.length) return;
    const last = strokes[strokes.length - 1];
    const next = strokes.slice(0, -1);
    setStrokes(next);
    setRedo((r) => [...r, last]);
    onChange(next);
  };

  const redoOne = () => {
    if (!redo.length) return;
    const s = redo[redo.length - 1];
    const next = [...strokes, s];
    setStrokes(next);
    setRedo((r) => r.slice(0, -1));
    onChange(next);
  };

  const clearAll = () => {
    if (!strokes.length) return;
    if (!window.confirm("그림을 모두 지울까요?")) return;
    commit([]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className="sticker relative mx-auto aspect-square w-full max-w-[640px] overflow-hidden rounded-card"
        style={{ background }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          role="img"
          aria-label={`그림판. 획 ${strokes.length}개`}
          data-strokes={strokes.length}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onContextMenu={(e) => e.preventDefault()}
          className="absolute inset-0 h-full w-full cursor-crosshair touch-none select-none [-webkit-touch-callout:none] [-webkit-user-select:none]"
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2" role="toolbar" aria-label="그리기 도구">
        <ToolButton pressed={tool === "pen"} onClick={() => setTool("pen")}>
          펜
        </ToolButton>
        <ToolButton pressed={tool === "eraser"} onClick={() => setTool("eraser")}>
          지우개
        </ToolButton>
        <span className="mx-1 h-8 w-0.5 bg-line" aria-hidden="true" />
        {PEN_SIZES.map((s) => (
          <ToolButton key={s.key} pressed={size === s.size} onClick={() => setSize(s.size)} label={`굵기 ${s.label}`}>
            <span aria-hidden="true" className="rounded-full bg-ink" style={{ width: s.size / 2 + 4, height: s.size / 2 + 4 }} />
          </ToolButton>
        ))}
        <span className="mx-1 h-8 w-0.5 bg-line" aria-hidden="true" />
        <ToolButton onClick={undo} disabled={!strokes.length}>
          되돌리기
        </ToolButton>
        <ToolButton onClick={redoOne} disabled={!redo.length}>
          다시하기
        </ToolButton>
        <ToolButton onClick={clearAll} disabled={!strokes.length}>
          모두 지우기
        </ToolButton>
      </div>

      <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="펜 색">
        {PEN_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={tool === "pen" && color === c}
            aria-label={`색 ${c}`}
            onClick={() => {
              setColor(c);
              setTool("pen");
            }}
            className={`size-12 rounded-full border-2 ${tool === "pen" && color === c ? "border-ink ring-4 ring-blue" : "border-line"}`}
            style={{ background: c }}
          />
        ))}
      </div>

      {penOnly ? (
        <p className="text-center text-sm font-bold text-muted">
          펜슬로만 그리는 중이에요 (손바닥은 무시해요).{" "}
          <button type="button" onClick={() => setPenOnly(false)} className="text-blue-ink underline underline-offset-4">
            손가락으로도 그리기
          </button>
        </p>
      ) : null}
    </div>
  );
});

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
      onClick={onClick}
      disabled={disabled}
      className={`pressable inline-flex min-h-12 min-w-12 items-center justify-center rounded-button border-2 border-b-4 px-3 text-[15px] font-bold disabled:opacity-40 ${
        pressed ? "border-blue bg-blue-soft text-blue-ink" : "border-line bg-paper text-muted hover:bg-paper-dim"
      }`}
    >
      {children}
    </button>
  );
}
