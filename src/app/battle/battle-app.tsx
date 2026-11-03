"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { BattleCard, CardBack } from "@/components/battle/BattleCard";
import { Tori } from "@/components/mascot/Tori";
import { ReadAloudButton } from "@/components/speech/ReadAloudButton";
import { buildDeck, nextToriAction } from "@/lib/battle/ai";
import { ABILITIES, BOARD_MAX, DECK_SIZE, type Ability, type CardDef } from "@/lib/battle/cards";
import { applyAction, checkAction, legalActions, newBattle, type Action, type BattleEvent, type BattleState, type Side, type Unit } from "@/lib/battle/engine";

const ME: Side = 0;
const TORI: Side = 1;
const TORI_LEADER = { name: "토리", imageSrc: null, tint: "#f3e1ff" };

const RULES =
  "카드를 눌러서 필드에 내요. 카드를 내려면 번개 숫자만큼 에너지가 필요해요. 필드에 있는 내 카드를 누르고, 상대 카드나 토리를 눌러서 공격해요. 토리의 체력을 0으로 만들면 이겨요!";

type Props = { pool: CardDef[]; profileId: string; nickname: string };

/** 영웅 카드 배틀: 대장 고르기 → 토리와 대결 */
export function BattleApp({ pool, profileId, nickname }: Props) {
  const [leader, setLeader] = useState<CardDef | null>(null);
  const [game, setGame] = useState<{ state: BattleState; leader: CardDef } | null>(null);

  const myHeroes = useMemo(() => pool.filter((c) => c.isFamily && c.creatorId === profileId), [pool, profileId]);
  const officials = useMemo(() => pool.filter((c) => !c.isFamily), [pool]);

  const start = (chosen: CardDef) => {
    const seed = Date.now() % 2147483647;
    const include = myHeroes.filter((c) => c.id !== chosen.id).slice(0, 3);
    const mine = buildDeck(pool.filter((c) => c.id !== chosen.id), { include, seed });
    const tori = buildDeck(officials.length >= DECK_SIZE ? officials : pool, { seed: seed + 7 });
    const state = newBattle(
      { name: nickname, leader: { name: chosen.name, imageSrc: chosen.imageSrc, tint: chosen.tint }, deck: mine },
      { name: "토리", leader: TORI_LEADER, deck: tori },
      seed,
      ME,
    );
    setGame({ state, leader: chosen });
  };

  if (game) {
    return (
      <Game
        key={game.state.seed}
        initial={game.state}
        onAgain={() => start(game.leader)}
        onChangeLeader={() => {
          setGame(null);
          setLeader(game.leader);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-3">
        <Tori size={88} />
        <div className="sticker flex flex-1 items-center gap-3 rounded-card px-5 py-4">
          <div className="flex-1">
            <h1 className="text-[28px] font-bold leading-snug">누가 대장이 될까요?</h1>
            <p className="text-[15px] font-medium text-muted">대장을 고르면 카드 {DECK_SIZE}장이 저절로 모여요. 내가 만든 영웅도 들어가요!</p>
          </div>
          <ReadAloudButton text={`누가 대장이 될까요? ${RULES}`} compact />
        </div>
      </div>

      <AbilityLegend />

      {myHeroes.length ? <LeaderGrid title="내가 만든 영웅" cards={myHeroes} selected={leader} onPick={setLeader} /> : null}
      <LeaderGrid title="도감 인물" cards={pool.filter((c) => !(c.isFamily && c.creatorId === profileId))} selected={leader} onPick={setLeader} />

      <div className="sticky bottom-4 z-10 flex justify-center">
        <button
          type="button"
          disabled={!leader}
          onClick={() => leader && start(leader)}
          className="pressable inline-flex min-h-16 items-center rounded-button border-b-4 border-green-dark bg-green px-8 text-xl font-bold text-paper shadow-lg disabled:opacity-40"
        >
          {leader ? `${leader.name}(으)로 배틀 시작!` : "대장을 골라요"}
        </button>
      </div>
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

function AbilityLegend() {
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

/* ───────────── 게임 화면 ───────────── */

function Game({ initial, onAgain, onChangeLeader }: { initial: BattleState; onAgain: () => void; onChangeLeader: () => void }) {
  const [s, setS] = useState(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>();
  const [fx, setFx] = useState<{ id: number; events: BattleEvent[] }>({ id: 0, events: [] });
  const fxId = useRef(0);

  const act = (a: Action) => {
    const problem = checkAction(s, a);
    if (problem) {
      setNotice(problem);
      return;
    }
    const next = applyAction(s, a);
    setS(next);
    setFx({ id: ++fxId.current, events: next.events });
    setNotice(undefined);
  };

  // 토리 차례: 조금씩 쉬면서 하나씩
  useEffect(() => {
    if (s.turn !== TORI || s.winner !== null) return;
    const justStarted = s.events.some((e) => e.type === "turn" && e.side === TORI);
    const t = setTimeout(() => {
      const next = applyAction(s, nextToriAction(s));
      setS(next);
      setFx({ id: ++fxId.current, events: next.events });
    }, justStarted ? 1200 : 900);
    return () => clearTimeout(t);
  }, [s]);

  const me = s.players[ME];
  const tori = s.players[TORI];
  const myTurn = s.turn === ME && s.winner === null;
  const canTarget = (target: string) => myTurn && selected !== null && !checkAction(s, { type: "attack", attacker: selected, target });
  const onlyEnd = myTurn && legalActions(s).length === 1;

  const guide = !myTurn
    ? s.winner === null
      ? "토리 차례… 🤔"
      : ""
    : notice ??
      (selected
        ? "누구를 공격할까요? 반짝이는 곳을 눌러요."
        : onlyEnd
          ? "할 수 있는 게 다 끝났어요. '차례 끝'을 눌러요."
          : "카드를 눌러서 내고, 필드의 내 카드를 눌러 공격해요.");

  const damageOn = (side: Side, target: string) =>
    fx.events.filter((e): e is Extract<BattleEvent, { type: "damage" }> => e.type === "damage" && e.side === side && e.target === target);

  return (
    <div className="flex flex-col gap-3" data-battle-turn={s.turn} data-battle-winner={s.winner ?? undefined}>
      {/* 토리 */}
      <PlayerBar
        side={TORI}
        player={tori}
        isTurn={s.turn === TORI}
        targetable={canTarget("leader")}
        onTarget={() => selected && act({ type: "attack", attacker: selected, target: "leader" })}
        hits={damageOn(TORI, "leader")}
        fxId={fx.id}
      />
      <Board
        side={TORI}
        units={tori.board}
        fxId={fx.id}
        damageOn={(uid) => damageOn(TORI, uid)}
        isTarget={(uid) => canTarget(uid)}
        onTap={(u) => (selected ? act({ type: "attack", attacker: selected, target: u.uid }) : setNotice("내 카드를 먼저 골라요."))}
      />

      <p role="status" aria-live="polite" className="min-h-8 rounded-button bg-paper-dim px-4 py-1.5 text-center text-[17px] font-bold">
        {guide}
      </p>

      {/* 나 */}
      <Board
        side={ME}
        units={me.board}
        fxId={fx.id}
        damageOn={(uid) => damageOn(ME, uid)}
        isSelected={(uid) => selected === uid}
        isReady={(u) => myTurn && u.ready}
        onTap={(u) => {
          if (!myTurn) return;
          if (!u.ready) {
            setNotice(`${u.card.name}은(는) 다음 차례에 공격할 수 있어요.`);
            return;
          }
          setNotice(undefined);
          setSelected((cur) => (cur === u.uid ? null : u.uid));
        }}
      />
      <PlayerBar side={ME} player={me} isTurn={myTurn} hits={damageOn(ME, "leader")} fxId={fx.id}>
        <button
          type="button"
          disabled={!myTurn}
          onClick={() => {
            setSelected(null);
            act({ type: "end" });
          }}
          className={`pressable inline-flex min-h-14 items-center rounded-button border-b-4 px-5 text-lg font-bold disabled:opacity-40 ${
            onlyEnd ? "animate-pulse border-green-dark bg-green text-paper" : "border-line bg-paper text-blue-ink"
          }`}
        >
          차례 끝 →
        </button>
      </PlayerBar>

      {/* 내 손패 */}
      <div className="flex gap-2 overflow-x-auto pb-2 pt-1" aria-label="내 손패">
        {me.hand.map((c, i) => {
          const playable = myTurn && !checkAction(s, { type: "play", handIndex: i });
          return (
            <button
              key={`${c.id}-${i}`}
              type="button"
              aria-label={`${c.name} 내기 (비용 ${c.cost}, 공격 ${c.attack}, 체력 ${c.health})`}
              onClick={() => {
                setSelected(null);
                act({ type: "play", handIndex: i });
              }}
              className={`battle-anim shrink-0 rounded-[18px] p-0.5 transition-transform [animation:card-in_.35s_ease-out] ${playable ? "-translate-y-1 bg-green" : ""}`}
            >
              <BattleCard card={c} dim={myTurn && !playable} />
            </button>
          );
        })}
        {me.hand.length === 0 ? <p className="py-6 text-[15px] font-bold text-muted">손에 든 카드가 없어요</p> : null}
      </div>
      <p className="text-center text-[13px] font-bold text-muted">
        남은 덱 {me.deck.length}장 · 필드 {me.board.length}/{BOARD_MAX}
      </p>

      {s.winner !== null ? <EndDialog won={s.winner === ME} onAgain={onAgain} onChangeLeader={onChangeLeader} /> : null}
    </div>
  );
}

function PlayerBar({
  side,
  player,
  isTurn,
  targetable = false,
  onTarget,
  hits,
  fxId,
  children,
}: {
  side: Side;
  player: BattleState["players"][number];
  isTurn: boolean;
  targetable?: boolean;
  onTarget?: () => void;
  hits: { amount: number }[];
  fxId: number;
  children?: React.ReactNode;
}) {
  const l = player.leader;
  const avatar = (
    <span
      key={hits.length ? `hit-${fxId}` : "still"}
      className={`battle-anim relative flex size-16 shrink-0 items-center justify-center overflow-visible rounded-full border-4 ${
        targetable ? "border-red ring-4 ring-red/50" : "border-line"
      } ${hits.length ? "[animation:hit-shake_.4s]" : ""}`}
      style={{ background: l.tint }}
    >
      {side === TORI ? (
        <Tori size={52} mood={hits.length ? "wow" : "happy"} />
      ) : l.imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- 가족 전용 비공개 그림
        <img src={l.imageSrc} alt="" className="absolute inset-0 h-full w-full rounded-full object-cover" />
      ) : (
        <span className="font-display text-3xl">{l.name[0]}</span>
      )}
      {hits.map((h, i) => (
        <span key={`${fxId}-${i}`} className="battle-anim pointer-events-none absolute left-1/2 top-0 z-10 font-display text-3xl text-[#b42318] [animation:float-up_.9s_ease-out_forwards]">
          -{h.amount}
        </span>
      ))}
    </span>
  );
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-card border-2 p-2.5 ${isTurn ? "border-green bg-green-soft" : "border-line bg-paper"}`}>
      {targetable ? (
        <button type="button" onClick={onTarget} aria-label={`${l.name} 대장 공격하기`} className="rounded-full">
          {avatar}
        </button>
      ) : (
        avatar
      )}
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-lg font-bold">
          {side === TORI ? "토리" : `${player.name} · 대장 ${l.name}`}
        </span>
        <span className="flex items-center gap-1 font-black" aria-label={`체력 ${l.hp}`}>
          <span aria-hidden="true">❤️</span>
          <span className={l.hp <= 5 ? "text-[#b42318]" : ""}>{Math.max(0, l.hp)}</span>
          <span className="text-sm font-bold text-muted">/ {l.maxHp}</span>
        </span>
      </div>
      <div className="flex items-center gap-1" aria-label={`에너지 ${player.energy} / ${player.maxEnergy}`}>
        {Array.from({ length: player.maxEnergy }, (_, i) => (
          <span key={i} aria-hidden="true" className={`flex size-7 items-center justify-center rounded-full text-sm ${i < player.energy ? "bg-blue text-paper" : "bg-line text-muted"}`}>
            ⚡
          </span>
        ))}
      </div>
      {side === TORI ? (
        <div className="ml-auto flex gap-1" aria-label={`토리 손패 ${player.hand.length}장`}>
          {player.hand.map((_, i) => (
            <CardBack key={i} />
          ))}
        </div>
      ) : (
        <div className="ml-auto">{children}</div>
      )}
    </div>
  );
}

function Board({
  side,
  units,
  fxId,
  damageOn,
  onTap,
  isTarget = () => false,
  isSelected = () => false,
  isReady = () => false,
}: {
  side: Side;
  units: Unit[];
  fxId: number;
  damageOn: (uid: string) => { amount: number }[];
  onTap: (u: Unit) => void;
  isTarget?: (uid: string) => boolean;
  isSelected?: (uid: string) => boolean;
  isReady?: (u: Unit) => boolean;
}) {
  return (
    <div
      className="flex min-h-[196px] items-center justify-center gap-2 rounded-card border-2 border-dashed border-line px-2 py-2"
      aria-label={side === TORI ? "토리 필드" : "내 필드"}
    >
      {units.length === 0 ? <span className="text-[15px] font-bold text-muted">{side === TORI ? "토리 필드" : "내 필드 (카드를 내면 여기로)"}</span> : null}
      {units.map((u) => {
        const hits = damageOn(u.uid);
        const target = isTarget(u.uid);
        const sel = isSelected(u.uid);
        const ready = isReady(u);
        return (
          <button
            key={u.uid}
            type="button"
            onClick={() => onTap(u)}
            aria-label={`${u.card.name} (공격 ${u.attack}, 체력 ${u.health})${target ? " 공격하기" : ready ? " 공격할 카드로 고르기" : ""}`}
            aria-pressed={sel || undefined}
            className={`battle-anim relative rounded-[18px] p-0.5 transition-transform [animation:card-in_.35s_ease-out] ${
              sel ? "-translate-y-2 bg-blue" : target ? "bg-red" : ready ? "bg-green" : ""
            }`}
          >
            <span key={hits.length ? `hit-${fxId}` : "still"} className={`battle-anim block ${hits.length ? "[animation:hit-shake_.4s]" : ""}`}>
              <BattleCard card={u.card} attack={u.attack} health={u.health} maxHealth={u.maxHealth} showCost={false} />
            </span>
            {hits.map((h, i) => (
              <span key={`${fxId}-${i}`} className="battle-anim pointer-events-none absolute left-1/2 top-6 z-10 font-display text-4xl text-[#b42318] [animation:float-up_.9s_ease-out_forwards]">
                -{h.amount}
              </span>
            ))}
          </button>
        );
      })}
    </div>
  );
}

function EndDialog({ won, onAgain, onChangeLeader }: { won: boolean; onAgain: () => void; onChangeLeader: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={won ? "이겼어요" : "졌어요"} className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-4 rounded-card bg-paper p-6 text-center [animation:pop_.5s_ease-out]">
        <Tori size={120} mood="wow" />
        <p className="font-display text-5xl text-green-dark">{won ? "이겼어요! 🎉" : "토리가 이겼어요!"}</p>
        <p className="text-lg font-medium text-muted">{won ? "토리가 깜짝 놀랐어요. 또 해 볼까요?" : "아깝다! 다시 도전해 볼까요?"}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={onAgain} className="pressable min-h-14 rounded-button border-b-4 border-green-dark bg-green px-6 text-lg font-bold text-paper">
            다시 하기
          </button>
          <button type="button" onClick={onChangeLeader} className="sticker pressable min-h-14 rounded-button px-5 font-bold text-blue-ink">
            대장 바꾸기
          </button>
          <Link href="/" className="sticker pressable inline-flex min-h-14 items-center rounded-button px-5 font-bold text-blue-ink">
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
