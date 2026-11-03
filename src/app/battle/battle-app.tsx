"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { recordBattleAction } from "@/app/actions/battle";
import { ProfileAvatar } from "@/components/family/ProfileAvatar";
import { Tori } from "@/components/mascot/Tori";
import { ReadAloudButton } from "@/components/speech/ReadAloudButton";
import { buildDeck } from "@/lib/battle/ai";
import { DECK_SIZE, type CardDef } from "@/lib/battle/cards";
import { newBattle, type BattleState, type Side } from "@/lib/battle/engine";

import { Game } from "./game";
import { PlayerSetup } from "./setup";
import { seatName, type Loadout, type Profile, type Seat, type StatsView } from "./types";

const TORI_LEADER = { name: "토리", imageSrc: null, tint: "#f3e1ff" };
const RULES =
  "카드를 눌러서 필드에 내요. 카드를 내려면 번개 숫자만큼 에너지가 필요해요. 필드에 있는 내 카드를 누르고, 상대 카드나 대장을 눌러서 공격해요. 상대 대장의 체력을 0으로 만들면 이겨요!";

type Phase =
  | { k: "menu" }
  | { k: "setup"; seats: [Seat, Seat]; first: Loadout | null; handoff: boolean }
  | { k: "game"; seats: [Seat, Seat]; loadouts: [Loadout, Loadout]; state: BattleState };

/** 카드 배틀: 처음 화면(누구와?) → 준비(대장·덱) → 대결 → 전적 저장 */
export function BattleApp({ pool, me, profiles, stats }: { pool: CardDef[]; me: Profile; profiles: Profile[]; stats: StatsView }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ k: "menu" });
  const officials = pool.filter((c) => !c.isFamily);

  const start = (seats: [Seat, Seat], loadouts: [Loadout, Loadout]) => {
    const seed = Date.now() % 2147483647;
    // 토리 대결은 아이가 먼저, 둘이 대결은 동전 던지기
    const duo = seats[1].kind === "kid";
    const first: Side = duo ? ((seed % 2) as Side) : 0;
    const toriLoadout = (l: Loadout): Loadout => ({ ...l, deck: buildDeck(officials.length >= DECK_SIZE ? officials : pool, { seed: seed + 7 }) });
    const lo: [Loadout, Loadout] = [loadouts[0], seats[1].kind === "tori" ? toriLoadout(loadouts[1]) : loadouts[1]];
    const setup = (seat: Seat, l: Loadout) => ({
      name: seatName(seat),
      leader: seat.kind === "tori" ? TORI_LEADER : { name: l.leader.name, imageSrc: l.leader.imageSrc, tint: l.leader.tint },
      deck: l.deck,
    });
    setPhase({ k: "game", seats, loadouts: lo, state: newBattle(setup(seats[0], lo[0]), setup(seats[1], lo[1]), seed, first) });
  };

  const record = useCallback(
    (seats: [Seat, Seat], loadouts: [Loadout, Loadout]) => (s: BattleState) => {
      if (s.winner === null || seats[0].kind !== "kid") return;
      void recordBattleAction({
        p1Id: seats[0].profile.id,
        p2Id: seats[1].kind === "kid" ? seats[1].profile.id : null,
        winner: s.winner + 1,
        p1Leader: loadouts[0].leader.name,
        p2Leader: seats[1].kind === "tori" ? "토리" : loadouts[1].leader.name,
        turns: s.turnNo,
      }).catch(() => {});
    },
    [],
  );

  const toMenu = () => {
    setPhase({ k: "menu" });
    router.refresh(); // 전적 새로 불러오기
  };

  if (phase.k === "game") {
    return (
      <Game
        key={phase.state.seed}
        initial={phase.state}
        seats={phase.seats}
        onFinished={record(phase.seats, phase.loadouts)}
        onAgain={() => start(phase.seats, phase.loadouts)}
        onMenu={toMenu}
      />
    );
  }

  if (phase.k === "setup") {
    const { seats, first, handoff } = phase;
    const kid1 = seats[1].kind === "kid" ? seats[1].profile : null;
    if (handoff && kid1) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 rounded-card bg-[#f3e1ff] p-8 text-center">
          <ProfileAvatar nickname={kid1.nickname} avatar={kid1.avatar} size={120} />
          <p className="font-display text-5xl text-[#7a3fb0]">{kid1.nickname} 차례예요!</p>
          <p className="text-xl font-bold text-muted">패드를 {kid1.nickname}에게 넘겨 주세요. 대장과 카드를 골라요.</p>
          <button
            type="button"
            onClick={() => setPhase({ ...phase, handoff: false })}
            className="pressable min-h-16 rounded-button border-b-4 border-[#7a3fb0] bg-purple px-8 text-xl font-bold text-paper"
          >
            {kid1.nickname} 준비됐어요!
          </button>
        </div>
      );
    }
    const chooser = first && kid1 ? kid1 : seats[0].kind === "kid" ? seats[0].profile : me;
    return (
      <PlayerSetup
        key={chooser.id}
        profile={chooser}
        pool={pool}
        onBack={() => setPhase({ k: "menu" })}
        onReady={(l) => {
          if (!kid1) return start(seats, [l, l]); // 토리 덱은 start에서 새로 만듦
          if (!first) return setPhase({ k: "setup", seats, first: l, handoff: true });
          start(seats, [first, l]);
        }}
      />
    );
  }

  const siblings = profiles.filter((p) => p.id !== me.id);
  const mySeat: Seat = { kind: "kid", profile: me };
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-3">
        <Tori size={88} />
        <div className="sticker flex flex-1 items-center gap-3 rounded-card px-5 py-4">
          <div className="flex-1">
            <h1 className="text-[28px] font-bold leading-snug">누구와 대결할까요?</h1>
            <p className="text-[15px] font-medium text-muted">대장을 고르고 카드 {DECK_SIZE}장을 모아서 대결해요.</p>
          </div>
          <ReadAloudButton text={`누구와 대결할까요? ${RULES}`} compact />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setPhase({ k: "setup", seats: [mySeat, { kind: "tori" }], first: null, handoff: false })}
          className="sticker pressable flex items-center gap-4 rounded-card bg-[#f3e1ff] p-5 text-left transition-transform hover:-translate-y-1"
        >
          <Tori size={72} />
          <span className="flex flex-col">
            <span className="font-display text-3xl text-[#7a3fb0]">토리와 대결</span>
            <span className="font-medium text-ink">혼자서도 할 수 있어요</span>
          </span>
        </button>
        {siblings.map((sib) => (
          <button
            key={sib.id}
            type="button"
            onClick={() => setPhase({ k: "setup", seats: [mySeat, { kind: "kid", profile: sib }], first: null, handoff: false })}
            className="sticker pressable flex items-center gap-4 rounded-card bg-green-soft p-5 text-left transition-transform hover:-translate-y-1"
          >
            <span className="flex -space-x-3">
              <ProfileAvatar nickname={me.nickname} avatar={me.avatar} size={56} />
              <ProfileAvatar nickname={sib.nickname} avatar={sib.avatar} size={56} />
            </span>
            <span className="flex flex-col">
              <span className="font-display text-3xl text-green-ink">{sib.nickname}와 대결</span>
              <span className="font-medium text-ink">패드 하나로 번갈아 해요</span>
            </span>
          </button>
        ))}
      </div>

      <StatsPanel stats={stats} />
    </div>
  );
}

function StatsPanel({ stats }: { stats: StatsView }) {
  const played = stats.players.some((p) => p.vsTori.wins + p.vsTori.losses + p.vsFamily.length > 0);
  return (
    <section aria-labelledby="battle-stats" className="flex flex-col gap-3">
      <h2 id="battle-stats" className="text-2xl font-bold">
        전적
      </h2>
      {!played ? (
        <p className="rounded-card bg-paper-dim p-5 font-medium text-muted">아직 대결한 적이 없어요. 첫 대결을 해 볼까요?</p>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {stats.players.map((p) => (
              <li key={p.id} className="sticker flex items-center gap-3 rounded-card p-4">
                <ProfileAvatar nickname={p.nickname} avatar={p.avatar} size={48} />
                <span className="flex flex-col gap-0.5">
                  <span className="text-lg font-bold">{p.nickname}</span>
                  <span className="text-[15px] font-bold text-muted">
                    토리와 {p.vsTori.wins}승 {p.vsTori.losses}패
                  </span>
                  {p.vsFamily.map((f) => (
                    <span key={f.opponentId} className="text-[15px] font-bold text-muted">
                      {f.nickname}와 {f.wins}승 {f.losses}패
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          {stats.recent.length ? (
            <ul className="flex flex-col gap-1.5" aria-label="최근 대결">
              {stats.recent.map((r) => (
                <li key={r.id} className="rounded-button bg-paper-dim px-4 py-2 text-[15px] font-medium">
                  <b>{r.p1}</b>({r.p1Leader}) vs <b>{r.p2}</b>({r.p2Leader}) → <b className="text-green-ink">{r.winner} 승</b>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </section>
  );
}
