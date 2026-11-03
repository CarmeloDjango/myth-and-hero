"use client";

import { useEffect, useRef, useState } from "react";

import { DrawingCanvas, type DrawingCanvasHandle } from "@/components/drawing/DrawingCanvas";
import { CANVAS_SIZE, MAX_BACKGROUND_BYTES, type Stroke } from "@/lib/heroes/rules";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

/** 고른 사진 → 1024×1024 JPEG (가운데 맞춤, 남는 곳은 흰색). 아이폰 HEIC도 브라우저가 읽어 JPEG로 바꿉니다. */
async function photoToBackground(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("사진을 열 수 없어요."));
      img.src = url;
    });
    const c = document.createElement("canvas");
    c.width = c.height = CANVAS_SIZE;
    const x = c.getContext("2d")!;
    x.fillStyle = "#fff";
    x.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const k = Math.min(CANVAS_SIZE / img.naturalWidth, CANVAS_SIZE / img.naturalHeight);
    const w = img.naturalWidth * k;
    const h = img.naturalHeight * k;
    x.drawImage(img, (CANVAS_SIZE - w) / 2, (CANVAS_SIZE - h) / 2, w, h);
    for (const q of [0.88, 0.75, 0.6]) {
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", q));
      if (blob && blob.size <= MAX_BACKGROUND_BYTES) return blob;
    }
    throw new Error("사진이 너무 커요.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * 그리기 + 자동 저장 (영웅 그림, 세계관 표지, 공식 인물 그림 공용)
 * - 그리다 멈추고 1.5초 뒤 그림과 그리기 기록을 saveUrl로 올립니다 (multipart, src/lib/drawing/http.ts).
 * - hasDrawing이면 saveUrl?strokes=1에서 저장된 기록(과 밑그림 사진 주소)을 불러와 이어 그립니다.
 * - allowPhoto면 "사진 올리기"로 밑그림 사진을 깔고 그 위에 덧그릴 수 있습니다.
 * - children(render prop)에 flush()를 넘겨, "다음" 버튼이 저장을 마친 뒤 넘어가게 합니다.
 */
export function AutosaveDrawing({
  saveUrl,
  background,
  hasDrawing,
  allowPhoto = false,
  children,
}: {
  saveUrl: string;
  background: string;
  hasDrawing: boolean;
  allowPhoto?: boolean;
  children: (api: { flush: () => Promise<boolean>; touched: boolean; ready: boolean }) => React.ReactNode;
}) {
  const canvas = useRef<DrawingCanvasHandle>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  /** 아직 안 올린 변경 (null이면 올릴 것 없음) */
  const latest = useRef<Stroke[] | null>(null);
  /** 지금 그림판의 기록 전체 (사진만 바꿨을 때도 같이 올림) */
  const current = useRef<Stroke[]>([]);
  /** 아직 안 올린 밑그림 변경: 새 사진, 또는 "clear"(사진 빼기) */
  const pendingBg = useRef<Blob | "clear" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<boolean> | null>(null);
  const [initial, setInitial] = useState<Stroke[] | null>(hasDrawing ? null : []);
  const [underlay, setUnderlay] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("idle");
  const [photoError, setPhotoError] = useState<string>();

  useEffect(() => {
    if (!hasDrawing) return;
    let alive = true;
    fetch(`${saveUrl}?strokes=1`)
      .then((r) => (r.ok ? r.json() : { strokes: [] }))
      .then((d: { strokes: Stroke[]; background?: string | null }) => {
        if (!alive) return;
        current.current = d.strokes;
        setUnderlay(d.background ?? null);
        setInitial(d.strokes);
      })
      .catch(() => alive && setInitial([]));
    return () => {
      alive = false;
    };
  }, [saveUrl, hasDrawing]);

  // 방금 고른 사진의 임시 주소(blob:)는 바뀌거나 화면을 나갈 때 정리합니다.
  useEffect(() => {
    if (!underlay?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(underlay);
  }, [underlay]);

  const upload = async (): Promise<boolean> => {
    const strokes = latest.current;
    if (!strokes) return true;
    const bg = pendingBg.current;
    const image = await canvas.current?.exportPng();
    if (!image) return false;
    const body = new FormData();
    body.set("png", image, image.type === "image/jpeg" ? "drawing.jpg" : "drawing.png");
    body.set("strokes", JSON.stringify(strokes));
    if (bg === "clear") body.set("clearBackground", "1");
    else if (bg) body.set("background", bg, "background.jpg");
    setSave("saving");
    try {
      const res = await fetch(saveUrl, { method: "POST", body });
      const data = (await res.json()) as { ok: boolean };
      if (!data.ok) throw new Error();
      if (latest.current === strokes) latest.current = null;
      if (pendingBg.current === bg) pendingBg.current = null;
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

  const schedule = () => {
    setSave("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 1500);
  };

  const onChange = (strokes: Stroke[]) => {
    current.current = strokes;
    latest.current = strokes;
    schedule();
  };

  const onPickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError(undefined);
    try {
      const blob = await photoToBackground(file);
      pendingBg.current = blob;
      setUnderlay(URL.createObjectURL(blob));
      latest.current = current.current;
      schedule();
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "사진을 열 수 없어요.");
    }
  };

  const removePhoto = () => {
    if (!window.confirm("밑그림 사진을 뺄까요? 그 위에 그린 그림은 남아요.")) return;
    pendingBg.current = "clear";
    setUnderlay(null);
    latest.current = current.current;
    schedule();
  };

  return (
    <div className="flex flex-col gap-4">
      {allowPhoto && initial ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            aria-label="사진 고르기"
            className="sr-only"
            onChange={(e) => {
              void onPickPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="sticker pressable inline-flex min-h-12 items-center gap-2 rounded-button bg-paper px-4 font-bold text-blue-ink hover:bg-paper-dim"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round">
              <path d="M4 8 h3 l2-3 h6 l2 3 h3 v11 h-16 z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            {underlay ? "사진 바꾸기" : "사진 올리기"}
          </button>
          {underlay ? (
            <button type="button" onClick={removePhoto} className="sticker pressable min-h-12 rounded-button bg-paper px-4 font-bold text-muted hover:bg-paper-dim">
              사진 빼기
            </button>
          ) : (
            <span className="text-sm font-medium text-muted">종이에 그린 그림이나 좋아하는 그림을 올리고 그 위에 그려요</span>
          )}
        </div>
      ) : null}
      {photoError ? (
        <p role="alert" className="text-center text-sm font-bold text-[#b42318]">
          {photoError}
        </p>
      ) : null}
      {initial ? (
        <DrawingCanvas ref={canvas} initialStrokes={initial} background={background} underlay={underlay} onChange={onChange} />
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
