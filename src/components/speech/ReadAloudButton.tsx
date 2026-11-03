"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** 소리 내어 읽기 (브라우저 내장 음성, 한국어). compact는 말풍선 옆 작은 버튼 */
export function ReadAloudButton({ text, compact = false }: { text: string; compact?: boolean }) {
  const [speaking, setSpeaking] = useState(false);
  // 지원 여부는 브라우저에서만 알 수 있습니다. 서버 렌더링에서는 지원한다고 보고 그립니다.
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => "speechSynthesis" in window,
    () => true,
  );

  // 화면을 떠나면 읽기를 멈춥니다.
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  if (!supported) return null;

  const toggle = () => {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.rate = 0.9;
    const voice = synth.getVoices().find((v) => v.lang.startsWith("ko"));
    if (voice) u.voice = voice;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={speaking}
        aria-label={speaking ? "그만 읽기" : "질문 읽어 주기"}
        className="sticker pressable inline-flex size-12 shrink-0 items-center justify-center rounded-button bg-paper text-blue-ink hover:bg-paper-dim"
      >
        <SpeakerIcon />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={speaking}
      className="pressable inline-flex min-h-14 items-center gap-2.5 rounded-button border-b-4 border-green-dark bg-green px-6 text-[17px] font-bold tracking-[0.053em] text-paper hover:brightness-105"
    >
      <SpeakerIcon />
      {speaking ? "그만 읽기" : "읽어 주세요"}
    </button>
  );
}

function SpeakerIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" />
      <path d="M16.5 8.5 A5 5 0 0 1 16.5 15.5" />
      <path d="M19 6 A8.5 8.5 0 0 1 19 18" />
    </svg>
  );
}
