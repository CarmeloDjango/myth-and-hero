"use client";

import { useMemo, useState } from "react";

import { BattleCard } from "@/components/battle/BattleCard";
import { ProfileAvatar } from "@/components/family/ProfileAvatar";
import { ReadAloudButton } from "@/components/speech/ReadAloudButton";
import { buildDeck } from "@/lib/battle/ai";
import { ABILITIES, DECK_SIZE, RULES, type Ability, type CardDef } from "@/lib/battle/cards";

import type { Loadout, Profile } from "./types";

const deckKey = (profileId: string) => `battle-deck:${profileId}`;

/** 지난번에 직접 고른 덱 (이 기기에서만, 편의 기능) */
function loadSavedDeck(profileId: string, pool: CardDef[]): CardDef[] {
  try {
    const ids = JSON.parse(localStorage.getItem(deckKey(profileId)) ?? "[]") as string[];
    const byId = new Map(pool.map((c) => [c.id, c]));
    return ids.map((id) => byId.get(id)).filter((c): c is CardDef => !!c);
  } catch {
    return [];
  }
}
function saveDeck(profileId: string, deck: CardDef[]) {
  try {
    localStorage.setItem(deckKey(profileId), JSON.stringify(deck.map((c) => c.id)));
  } catch {
    /* 저장 못 해도 게임은 그대로 */
  }
}

/**
 * 한 사람 준비: 대장 고르기 → 덱 (자동으로 모으기 / 직접 고르기)
 */
export function PlayerSetup({ profile, pool, onReady, onBack }: { profile: Profile; pool: CardDef[]; onReady: (l: Loadout) => void; onBack: () => void }) {
  const [leader, setLeader] = useState<CardDef | null>(null);
  const [building, setBuilding] = useState(false);
  const mine = useMemo(() => pool.filter((c) => c.isFamily && c.creatorId === profile.id), [pool, profile.id]);

  if (leader && building) {
    return (
      <DeckBuilder
        profile={profile}
        pool={pool.filter((c) => c.id !== leader.id)}
        onBack={() => setBuilding(false)}
        onDone={(deck) => {
          saveDeck(profile.id, deck);
          onReady({ leader, deck });
        }}
      />
    );
  }

  const auto = () => {
    if (!leader) return;
    const deck = buildDeck(
      pool.filter((c) => c.id !== leader.id),
      { include: mine.filter((c) => c.id !== leader.id).slice(0, 3), seed: Date.now() % 2147483647 },
    );
    onReady({ leader, deck });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <ProfileAvatar nickname={profile.nickname} avatar={profile.avatar} size={64} />
        <div className="sticker flex flex-1 items-center gap-3 rounded-card px-5 py-4">
          <h1 className="flex-1 text-[26px] font-bold leading-snug">{profile.nickname}, 누가 대장이 될까요?</h1>
          <ReadAloudButton text={`${profile.nickname}, 누가 대장이 될까요? 대장을 고르고 카드 ${DECK_SIZE}장을 모아요.`} compact />
        </div>
      </div>

      <AbilityLegend />

      {mine.length ? <LeaderGrid title={`${profile.nickname}가 만든 영웅`} cards={mine} selected={leader} onPick={setLeader} /> : null}
      <LeaderGrid title="도감 인물" cards={pool.filter((c) => !(c.isFamily && c.creatorId === profile.id))} selected={leader} onPick={setLeader} />

      <div className="sticky bottom-4 z-10 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onBack} className="sticker pressable min-h-16 rounded-button bg-paper px-5 font-bold text-blue-ink shadow-lg">
          ← 처음으로
        </button>
        <button
          type="button"
          disabled={!leader}
          onClick={auto}
          className="pressable inline-flex min-h-16 items-center rounded-button border-b-4 border-green-dark bg-green px-6 text-lg font-bold text-paper shadow-lg disabled:opacity-40"
        >
          {leader ? `${leader.name} 대장, 카드 자동으로!` : "대장을 골라요"}
        </button>
        <button
          type="button"
          disabled={!leader}
          onClick={() => setBuilding(true)}
          className="pressable inline-flex min-h-16 items-center rounded-button border-b-4 border-[#7a3fb0] bg-purple px-6 text-lg font-bold text-paper shadow-lg disabled:opacity-40"
        >
          카드 직접 고르기
        </button>
      </div>
    </div>
  );
}

/**
 * 덱 직접 고르기: 카드 10장, 같은 카드는 한 장씩.
 * 위에 비용별 개수(카드 곡선)를 보여 줘서 너무 비싼 카드만 고르지 않게 돕습니다.
 */
export function DeckBuilder({ profile, pool, onDone, onBack }: { profile: Profile; pool: CardDef[]; onDone: (deck: CardDef[]) => void; onBack: () => void }) {
  const [picked, setPicked] = useState<CardDef[]>(() => loadSavedDeck(profile.id, pool).slice(0, DECK_SIZE));
  const [filter, setFilter] = useState<string>("전체");
  const series = useMemo(() => [...new Set(pool.map((c) => c.seriesName))], [pool]);
  const mine = (c: CardDef) => c.isFamily && c.creatorId === profile.id;
  const shown = pool.filter((c) => (filter === "전체" ? true : filter === "내 영웅" ? mine(c) : c.seriesName === filter));
  const has = (c: CardDef) => picked.some((p) => p.id === c.id);
  const toggle = (c: CardDef) =>
    setPicked((list) => (list.some((p) => p.id === c.id) ? list.filter((p) => p.id !== c.id) : list.length >= DECK_SIZE ? list : [...list, c]));
  const curve = [1, 2, 3, 4, 5].map((cost) => picked.filter((c) => c.cost === cost).length);
  const avg = picked.length ? picked.reduce((s, c) => s + c.cost, 0) / picked.length : 0;
  const fill = () => setPicked((list) => buildDeck(pool, { include: list, seed: Date.now() % 2147483647 }));

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-2 z-10 flex flex-col gap-3 rounded-card border-2 border-line bg-paper p-3 shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          <ProfileAvatar nickname={profile.nickname} avatar={profile.avatar} size={44} />
          <span className="text-xl font-bold" aria-live="polite">
            카드 {picked.length}/{DECK_SIZE}장
          </span>
          {/* 카드 곡선: 비용별 장수 */}
          <span className="flex items-end gap-1" aria-label={`비용별 장수 ${curve.join(", ")}`}>
            {curve.map((n, i) => (
              <span key={i} className="flex flex-col items-center text-[11px] font-bold text-muted">
                <span className="w-5 rounded-t bg-blue" style={{ height: 6 + n * 8 }} />⚡{i + 1}
              </span>
            ))}
          </span>
          {picked.length >= 5 && !picked.some((c) => c.cost <= RULES.startEnergy) ? (
            <span className="text-sm font-bold text-[#b42318]">⚡{RULES.startEnergy} 이하 카드가 없어요! 첫 차례에 낼 카드가 없어요</span>
          ) : avg >= 3.6 ? (
            <span className="text-sm font-bold text-[#b42318]">비싼 카드가 많아요! 처음에 낼 카드가 없을 수 있어요</span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onBack} className="sticker pressable min-h-12 rounded-button bg-paper px-4 font-bold text-blue-ink">
            ← 대장 다시 고르기
          </button>
          <button type="button" onClick={() => setPicked([])} disabled={!picked.length} className="sticker pressable min-h-12 rounded-button bg-paper px-4 font-bold text-muted disabled:opacity-40">
            비우기
          </button>
          <button type="button" onClick={fill} disabled={picked.length >= DECK_SIZE} className="sticker pressable min-h-12 rounded-button bg-paper px-4 font-bold text-blue-ink disabled:opacity-40">
            남은 칸 자동으로 채우기
          </button>
          <button
            type="button"
            disabled={picked.length !== DECK_SIZE}
            onClick={() => onDone(picked)}
            className="pressable ml-auto min-h-12 rounded-button border-b-4 border-green-dark bg-green px-5 font-bold text-paper disabled:opacity-40"
          >
            덱 완성!
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="카드 거르기">
        {["전체", ...(pool.some(mine) ? ["내 영웅"] : []), ...series].map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`pressable min-h-11 rounded-button border-2 border-b-4 px-3 text-[15px] font-bold ${filter === f ? "border-blue bg-blue-soft text-blue-ink" : "border-line bg-paper text-muted"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <ul className="flex flex-wrap gap-3" aria-label="고를 수 있는 카드">
        {shown.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              aria-pressed={has(c)}
              aria-label={`${c.name} ${has(c) ? "빼기" : "넣기"} (비용 ${c.cost}, 공격 ${c.attack}, 체력 ${c.health})`}
              onClick={() => toggle(c)}
              className={`pressable relative rounded-[18px] p-1 ${has(c) ? "bg-green ring-4 ring-green" : picked.length >= DECK_SIZE ? "opacity-50" : "hover:-translate-y-1"}`}
            >
              <BattleCard card={c} size="sm" />
              {has(c) ? (
                <span aria-hidden="true" className="absolute -right-1 -top-1 flex size-7 items-center justify-center rounded-full bg-green text-lg font-black text-paper">
                  ✓
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LeaderGrid({ title, cards, selected, onPick }: { title: string; cards: CardDef[]; selected: CardDef | null; onPick: (c: CardDef) => void }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-bold">{title}</h2>
      <ul className="flex flex-wrap gap-3">
        {cards.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              aria-pressed={selected?.id === c.id}
              aria-label={`${c.name} 대장으로 고르기`}
              onClick={() => onPick(c)}
              className={`pressable rounded-[18px] p-1 transition-transform ${selected?.id === c.id ? "-translate-y-1 bg-green ring-4 ring-green" : "hover:-translate-y-1"}`}
            >
              <BattleCard card={c} size="sm" showCost={false} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AbilityLegend() {
  const text = (Object.keys(ABILITIES) as Ability[]).map((k) => `${ABILITIES[k].name}: ${ABILITIES[k].text}`).join(" ");
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-card bg-paper-dim p-3">
      <span className="text-[15px] font-bold text-muted">특별한 힘</span>
      {(Object.keys(ABILITIES) as Ability[]).map((k) => (
        <span key={k} className="rounded-button border-2 border-line bg-paper px-3 py-1 text-[14px] font-bold">
          {ABILITIES[k].icon} {ABILITIES[k].name}: <span className="font-medium text-muted">{ABILITIES[k].text}</span>
        </span>
      ))}
      <ReadAloudButton text={text} compact />
    </div>
  );
}
