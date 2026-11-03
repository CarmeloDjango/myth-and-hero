"use client";

import { useEffect, useRef, useState } from "react";

import { BattleCard, CardBack } from "@/components/battle/BattleCard";
import { ProfileAvatar } from "@/components/family/ProfileAvatar";
import { Tori } from "@/components/mascot/Tori";
import { nextToriAction } from "@/lib/battle/ai";
import { BOARD_MAX } from "@/lib/battle/cards";
import { applyAction, checkAction, legalActions, type Action, type BattleEvent, type BattleState, type Side, type Unit } from "@/lib/battle/engine";

import { seatName, type Seat } from "./types";

const other = (s: Side) => (1 - s) as Side;

/**
 * 게임 화면
 * - 토리 대결: 아래가 아이(0번 자리), 위가 토리. 토리 차례는 0.9초 간격으로 하나씩.
 * - 둘이 대결: 지금 차례인 사람이 늘 아래. 차례가 바뀌면 화면을 가리고 "패드를 넘겨요" (손패를 몰래 보지 않게).
 */
export function Game({
  initial,
  seats,
  onAgain,
  onMenu,
  onFinished,
}: {
  initial: BattleState;
  seats: [Seat, Seat];
  onAgain: () => void;
  onMenu: () => void;
  onFinished: (s: BattleState) => void;
}) {
  const duo = seats[0].kind === "kid" && seats[1].kind === "kid";
  const [s, setS] = useState(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>();
  const [fx, setFx] = useState<{ id: number; events: BattleEvent[] }>({ id: 0, events: [] });
  // 둘이 대결: 처음과 차례가 바뀔 때마다 가림막
  const [covered, setCovered] = useState(duo);
  const fxId = useRef(0);
  const reported = useRef(false);

  const isTori = (side: Side) => seats[side].kind === "tori";
  const bottom: Side = duo ? s.turn : seats[0].kind === "tori" ? 1 : 0;
  const top = other(bottom);

  const commit = (next: BattleState) => {
    setS(next);
    setFx({ id: ++fxId.current, events: next.events });
  };

  const act = (a: Action) => {
    const problem = checkAction(s, a);
    if (problem) {
      setNotice(problem);
      return;
    }
    const next = applyAction(s, a);
    commit(next);
    setNotice(undefined);
    if (a.type === "end" && duo && next.winner === null) setCovered(true);
  };

  // 토리 차례: 조금씩 쉬면서 하나씩
  useEffect(() => {
    if (!isTori(s.turn) || s.winner !== null) return;
    const justStarted = s.events.some((e) => e.type === "turn" && e.side === s.turn);
    const t = setTimeout(() => commit(applyAction(s, nextToriAction(s))), justStarted ? 1200 : 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 상태가 바뀔 때마다 한 걸음
  }, [s]);

  // 끝나면 한 번만 전적 저장
  useEffect(() => {
    if (s.winner === null || reported.current) return;
    reported.current = true;
    onFinished(s);
  }, [s, onFinished]);

  if (covered && s.winner === null) {
    const who = seats[s.turn];
    const wait = seats[other(s.turn)];
    return (
      <PassCover
        seat={who}
        waiting={seatName(wait)}
        first={s.turnNo === 1 ? `동전을 던졌어요. ${seatName(who)} 먼저!` : null}
        onReady={() => setCovered(false)}
      />
    );
  }

  const me = s.players[bottom];
  const foe = s.players[top];
  const myTurn = s.turn === bottom && s.winner === null && !isTori(bottom);
  const canTarget = (target: string) => myTurn && selected !== null && !checkAction(s, { type: "attack", attacker: selected, target });
  const onlyEnd = myTurn && legalActions(s).length === 1;

  const crisisNow = fx.events.some((e) => e.type === "crisis" && e.side === s.turn);
  const bonusNow = !crisisNow && s.players[s.turn].energy > s.players[s.turn].maxEnergy;
  const guide = !myTurn
    ? s.winner === null
      ? `${seatName(seats[s.turn])} 차례… 🤔`
      : ""
    : (notice ??
      (crisisNow
        ? "위기의 힘! 체력이 낮아서 에너지를 1 더 받았어요 ⚡"
        : bonusNow
          ? "나중에 시작해서 에너지를 1 더 받았어요 ⚡"
          : selected
            ? "누구를 공격할까요? 반짝이는 곳을 눌러요."
            : onlyEnd
              ? "할 수 있는 게 다 끝났어요. '차례 끝'을 눌러요."
              : "카드를 눌러서 내고, 필드의 내 카드를 눌러 공격해요."));

  const damageOn = (side: Side, target: string) =>
    fx.events.filter((e): e is Extract<BattleEvent, { type: "damage" }> => e.type === "damage" && e.side === side && e.target === target);

  return (
    <div className="flex flex-col gap-3" data-battle-turn={s.turn} data-battle-bottom={bottom} data-battle-winner={s.winner ?? undefined}>
      <PlayerBar
        seat={seats[top]}
        player={foe}
        isTurn={s.turn === top}
        hidden
        targetable={canTarget("leader")}
        onTarget={() => selected && act({ type: "attack", attacker: selected, target: "leader" })}
        hits={damageOn(top, "leader")}
        fxId={fx.id}
      />
      <Board
        label={`${seatName(seats[top])} 필드`}
        units={foe.board}
        fxId={fx.id}
        damageOn={(uid) => damageOn(top, uid)}
        isTarget={(uid) => canTarget(uid)}
        onTap={(u) => (selected ? act({ type: "attack", attacker: selected, target: u.uid }) : setNotice("내 카드를 먼저 골라요."))}
      />

      <p role="status" aria-live="polite" className="min-h-8 rounded-button bg-paper-dim px-4 py-1.5 text-center text-[17px] font-bold">
        {guide}
      </p>

      <Board
        label="내 필드"
        empty="내 필드 (카드를 내면 여기로)"
        units={me.board}
        fxId={fx.id}
        damageOn={(uid) => damageOn(bottom, uid)}
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
      <PlayerBar seat={seats[bottom]} player={me} isTurn={myTurn} hits={damageOn(bottom, "leader")} fxId={fx.id}>
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

      {s.winner !== null ? <EndDialog seats={seats} winner={s.winner} onAgain={onAgain} onMenu={onMenu} /> : null}
    </div>
  );
}

/** 둘이 대결: 차례가 바뀔 때 손패를 가리고 패드를 넘기는 화면 */
function PassCover({ seat, waiting, first, onReady }: { seat: Seat; waiting: string; first: string | null; onReady: () => void }) {
  const name = seatName(seat);
  return (
    <div role="dialog" aria-label={`${name} 차례`} className="flex min-h-[70vh] flex-col items-center justify-center gap-5 rounded-card bg-[#f3e1ff] p-8 text-center">
      {first ? <p className="rounded-button bg-paper px-4 py-2 text-lg font-bold">🪙 {first}</p> : null}
      {seat.kind === "kid" ? <ProfileAvatar nickname={seat.profile.nickname} avatar={seat.profile.avatar} size={120} /> : null}
      <p className="font-display text-5xl text-[#7a3fb0]">{name} 차례예요!</p>
      <p className="text-xl font-bold text-muted">패드를 {name}에게 넘겨 주세요. {waiting}는 눈 감아요 🙈</p>
      <button
        type="button"
        onClick={onReady}
        className="pressable min-h-16 rounded-button border-b-4 border-[#7a3fb0] bg-purple px-8 text-xl font-bold text-paper"
      >
        {name} 준비됐어요!
      </button>
    </div>
  );
}

function PlayerBar({
  seat,
  player,
  isTurn,
  hidden = false,
  targetable = false,
  onTarget,
  hits,
  fxId,
  children,
}: {
  seat: Seat;
  player: BattleState["players"][number];
  isTurn: boolean;
  /** 손패를 뒤집어 보여줌 (위쪽 상대) */
  hidden?: boolean;
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
      {seat.kind === "tori" ? (
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
        <span className="flex items-center gap-1.5 truncate text-lg font-bold">
          {seat.kind === "kid" ? <ProfileAvatar nickname={seat.profile.nickname} avatar={seat.profile.avatar} size={24} /> : null}
          {seat.kind === "tori" ? "토리" : `${seat.profile.nickname} · 대장 ${l.name}`}
        </span>
        <span className="flex items-center gap-1 font-black" aria-label={`체력 ${l.hp}`}>
          <span aria-hidden="true">❤️</span>
          <span className={l.hp <= 5 ? "text-[#b42318]" : ""}>{Math.max(0, l.hp)}</span>
          <span className="text-sm font-bold text-muted">/ {l.maxHp}</span>
        </span>
      </div>
      <div className="flex items-center gap-1" aria-label={`에너지 ${player.energy} / ${player.maxEnergy}`}>
        {/* 보너스·위기의 힘으로 받은 에너지는 노란 칸으로 더 보여줍니다 */}
        {Array.from({ length: Math.max(player.maxEnergy, player.energy) }, (_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`flex size-7 items-center justify-center rounded-full text-sm ${
              i >= player.energy ? "bg-line text-muted" : i >= player.maxEnergy ? "bg-yellow text-ink" : "bg-blue text-paper"
            }`}
          >
            ⚡
          </span>
        ))}
      </div>
      {hidden ? (
        <div className="ml-auto flex gap-1" aria-label={`${seatName(seat)} 손패 ${player.hand.length}장`}>
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
  label,
  empty,
  units,
  fxId,
  damageOn,
  onTap,
  isTarget = () => false,
  isSelected = () => false,
  isReady = () => false,
}: {
  label: string;
  empty?: string;
  units: Unit[];
  fxId: number;
  damageOn: (uid: string) => { amount: number }[];
  onTap: (u: Unit) => void;
  isTarget?: (uid: string) => boolean;
  isSelected?: (uid: string) => boolean;
  isReady?: (u: Unit) => boolean;
}) {
  return (
    <div className="flex min-h-[196px] items-center justify-center gap-2 rounded-card border-2 border-dashed border-line px-2 py-2" aria-label={label}>
      {units.length === 0 ? <span className="text-[15px] font-bold text-muted">{empty ?? label}</span> : null}
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

function EndDialog({ seats, winner, onAgain, onMenu }: { seats: [Seat, Seat]; winner: Side; onAgain: () => void; onMenu: () => void }) {
  const vsTori = seats.some((x) => x.kind === "tori");
  const kidWon = seats[winner].kind === "kid";
  const title = vsTori ? (kidWon ? "이겼어요! 🎉" : "토리가 이겼어요!") : `${seatName(seats[winner])} 승리! 🎉`;
  const sub = vsTori ? (kidWon ? "토리가 깜짝 놀랐어요. 또 해 볼까요?" : "아깝다! 다시 도전해 볼까요?") : `${seatName(seats[1 - winner])}도 잘했어요! 한 판 더?`;
  const winSeat = seats[winner];
  return (
    <div role="dialog" aria-modal="true" aria-label={vsTori ? (kidWon ? "이겼어요" : "졌어요") : `${seatName(winSeat)} 승리`} className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-4 rounded-card bg-paper p-6 text-center [animation:pop_.5s_ease-out]">
        {winSeat.kind === "kid" && !vsTori ? <ProfileAvatar nickname={winSeat.profile.nickname} avatar={winSeat.profile.avatar} size={120} /> : <Tori size={120} mood="wow" />}
        <p className="font-display text-5xl text-green-dark">{title}</p>
        <p className="text-lg font-medium text-muted">{sub}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={onAgain} className="pressable min-h-14 rounded-button border-b-4 border-green-dark bg-green px-6 text-lg font-bold text-paper">
            같은 덱으로 다시
          </button>
          <button type="button" onClick={onMenu} className="sticker pressable min-h-14 rounded-button px-5 font-bold text-blue-ink">
            처음으로
          </button>
        </div>
      </div>
    </div>
  );
}
