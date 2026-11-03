"use client";

import { useEffect, useRef, useState } from "react";

import { DrawingCanvas, type DrawingCanvasHandle } from "@/components/drawing/DrawingCanvas";
import type { Stroke } from "@/lib/heroes/rules";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

/**
 * 그리기 + 자동 저장 (영웅 그림, 세계관 표지 공용)
 * - 그리다 멈추고 1.5초 뒤 PNG와 그리기 기록을 saveUrl로 올립니다 (multipart: png, strokes).
 * - hasDrawing이면 saveUrl?strokes=1에서 저장된 기록을 불러와 이어 그립니다.
 * - children(render prop)에 flush()를 넘겨, "다음" 버튼이 저장을 마친 뒤 넘어가게 합니다.
 */
export function AutosaveDrawing({
  saveUrl,
  background,
  hasDrawing,
  children,
}: {
  saveUrl: string;
  background: string;
  hasDrawing: boolean;
  children: (api: { flush: () => Promise<boolean>; touched: boolean; ready: boolean }) => React.ReactNode;
}) {
  const canvas = useRef<DrawingCanvasHandle>(null);
  const latest = useRef<Stroke[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<boolean> | null>(null);
  const [initial, setInitial] = useState<Stroke[] | null>(hasDrawing ? null : []);
  const [save, setSave] = useState<SaveState>("idle");

  useEffect(() => {
    if (!hasDrawing) return;
    let alive = true;
    fetch(`${saveUrl}?strokes=1`)
      .then((r) => (r.ok ? r.json() : { strokes: [] }))
      .then((d: { strokes: Stroke[] }) => alive && setInitial(d.strokes))
      .catch(() => alive && setInitial([]));
    return () => {
      alive = false;
    };
  }, [saveUrl, hasDrawing]);

  const upload = async (): Promise<boolean> => {
    const strokes = latest.current;
    if (!strokes) return true;
    const png = await canvas.current?.exportPng();
    if (!png) return false;
    const body = new FormData();
    body.set("png", png, "drawing.png");
    body.set("strokes", JSON.stringify(strokes));
    setSave("saving");
    try {
      const res = await fetch(saveUrl, { method: "POST", body });
      const data = (await res.json()) as { ok: boolean };
      if (!data.ok) throw new Error();
      if (latest.current === strokes) latest.current = null;
      setSave(latest.current ? "dirty" : "saved");
      return true;
    } catch {
      setSave("error");
      return false;
    }
  };

  const flush = async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (inflight.current) await inflight.current;
    if (!latest.current) return true;
    inflight.current = upload();
    const ok = await inflight.current;
    inflight.current = null;
    return ok;
  };

  const onChange = (strokes: Stroke[]) => {
    latest.current = strokes;
    setSave("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 1500);
  };

  return (
    <div className="flex flex-col gap-4">
      {initial ? (
        <DrawingCanvas ref={canvas} initialStrokes={initial} background={background} onChange={onChange} />
      ) : (
        <div role="status" className="mx-auto flex aspect-square w-full max-w-[640px] items-center justify-center rounded-card bg-paper-dim font-bold text-muted">
          그림 불러오는 중…
        </div>
      )}
      <p role="status" aria-live="polite" className="text-center text-sm font-bold text-muted">
        {save === "saving" ? "저장하는 중…" : save === "saved" ? "저장했어요 ✓" : save === "error" ? "저장하지 못했어요. 다시 해 볼게요." : save === "dirty" ? "곧 저장해요" : " "}
      </p>
      {/* flush는 버튼 클릭 같은 이벤트에서만 부릅니다 (렌더 중에 ref를 읽지 않음). */}
      {/* eslint-disable-next-line react-hooks/refs -- 위 이유로 의도적 */}
      {children({ flush, touched: save !== "idle", ready: initial !== null })}
    </div>
  );
}
