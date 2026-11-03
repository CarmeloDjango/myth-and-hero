/**
 * 영웅 카드 배틀 규칙 (순수 함수, 서버·클라이언트·테스트 공용)
 *
 * - 각자 대장(체력 20)과 카드 10장 덱. 먼저 하는 쪽은 3장, 나중에 하는 쪽은 4장을 뽑고 시작.
 * - 내 차례 시작: 에너지 칸 +1 (첫 차례는 2, 최대 6) 후 가득 채움, 카드 1장 뽑기, 필드의 카드들이 공격할 수 있게 됨.
 *   뽑을 카드가 없으면 대장이 1, 2, 3… 피해(지침).
 * - 카드 내기: 에너지를 비용만큼 쓰고 필드(최대 5칸)에 놓음. 낸 차례에는 공격 못 함 (돌격은 예외).
 * - 공격: 필드 카드 → 상대 카드(서로 공격력만큼 피해) 또는 상대 대장. 상대에게 지키기 카드가 있으면 그것부터.
 * - 대장 체력이 0이 되면 짐.
 *
 * 상태는 바꾸지 않고 새 상태를 돌려줍니다(되돌리기·테스트가 쉬움). 섞기는 상태 안의 seed로 해서 같은 seed면 같은 게임.
 */
import { BOARD_MAX, HAND_MAX, LEADER_HP, MAX_ENERGY, type CardDef } from "./cards";

export type Side = 0 | 1;

export type Unit = {
  uid: string;
  card: CardDef;
  attack: number;
  health: number;
  maxHealth: number;
  /** 이번 차례에 공격할 수 있는지 */
  ready: boolean;
};

export type Leader = { name: string; imageSrc: string | null; tint: string; hp: number; maxHp: number };

export type PlayerState = {
  name: string;
  leader: Leader;
  deck: CardDef[];
  hand: CardDef[];
  board: Unit[];
  energy: number;
  maxEnergy: number;
  /** 덱이 비었을 때 다음 지침 피해 */
  fatigue: number;
};

/** 화면 연출용 기록 (피해 숫자, 사라지는 카드 등) */
export type BattleEvent =
  | { type: "play"; side: Side; uid: string }
  | { type: "damage"; side: Side; target: string | "leader"; amount: number }
  | { type: "death"; side: Side; uid: string }
  | { type: "draw"; side: Side; count: number }
  | { type: "burn"; side: Side; card: string }
  | { type: "fatigue"; side: Side; amount: number }
  | { type: "turn"; side: Side };

export type BattleState = {
  players: [PlayerState, PlayerState];
  turn: Side;
  turnNo: number;
  winner: Side | null;
  seed: number;
  nextUid: number;
  /** 마지막 행동에서 생긴 일 */
  events: BattleEvent[];
};

export type Action =
  | { type: "play"; handIndex: number }
  | { type: "attack"; attacker: string; target: string | "leader" }
  | { type: "end" };

/* ───────────── 난수 (mulberry32) ───────────── */

function rand(state: { seed: number }): number {
  let t = (state.seed = (state.seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function shuffle<T>(list: T[], state: { seed: number }): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(state) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ───────────── 시작 ───────────── */

export type PlayerSetup = { name: string; leader: Omit<Leader, "hp" | "maxHp">; deck: CardDef[] };

export function newBattle(p0: PlayerSetup, p1: PlayerSetup, seed: number, first: Side = 0): BattleState {
  const rng = { seed };
  const mk = (p: PlayerSetup): PlayerState => ({
    name: p.name,
    leader: { ...p.leader, hp: LEADER_HP, maxHp: LEADER_HP },
    deck: shuffle(p.deck, rng),
    hand: [],
    board: [],
    energy: 0,
    maxEnergy: 0,
    fatigue: 1,
  });
  let s: BattleState = { players: [mk(p0), mk(p1)], turn: first, turnNo: 0, winner: null, seed: rng.seed, nextUid: 1, events: [] };
  const second = (1 - first) as Side;
  s = drawCards(s, first, 3);
  s = drawCards(s, second, 4);
  return startTurn({ ...s, events: [] }, first);
}

/* ───────────── 도우미 ───────────── */

const other = (side: Side) => (1 - side) as Side;

function setPlayer(s: BattleState, side: Side, p: PlayerState): BattleState {
  const players = [...s.players] as [PlayerState, PlayerState];
  players[side] = p;
  return { ...s, players };
}

function drawCards(s: BattleState, side: Side, n: number): BattleState {
  let p = s.players[side];
  const events: BattleEvent[] = [];
  let drawn = 0;
  for (let i = 0; i < n; i++) {
    const [top, ...rest] = p.deck;
    if (!top) {
      // 지침: 뽑을 카드가 없으면 대장이 점점 큰 피해
      const amount = p.fatigue;
      p = { ...p, fatigue: p.fatigue + 1, leader: { ...p.leader, hp: p.leader.hp - amount } };
      events.push({ type: "fatigue", side, amount }, { type: "damage", side, target: "leader", amount });
      continue;
    }
    if (p.hand.length >= HAND_MAX) {
      p = { ...p, deck: rest };
      events.push({ type: "burn", side, card: top.name });
      continue;
    }
    p = { ...p, deck: rest, hand: [...p.hand, top] };
    drawn++;
  }
  if (drawn) events.push({ type: "draw", side, count: drawn });
  return checkWinner({ ...setPlayer(s, side, p), events: [...s.events, ...events] });
}

function checkWinner(s: BattleState): BattleState {
  if (s.winner !== null) return s;
  const dead0 = s.players[0].leader.hp <= 0;
  const dead1 = s.players[1].leader.hp <= 0;
  // 둘 다 쓰러지면 지금 차례인 쪽이 진 것으로 (자기 차례에 지침으로 쓰러진 경우)
  if (dead0 && dead1) return { ...s, winner: other(s.turn) };
  if (dead0) return { ...s, winner: 1 };
  if (dead1) return { ...s, winner: 0 };
  return s;
}

function startTurn(s: BattleState, side: Side): BattleState {
  const p = s.players[side];
  // 첫 차례부터 2: 가장 싼 카드(비용 1~2)를 바로 낼 수 있게
  const maxEnergy = Math.min(MAX_ENERGY, Math.max(2, p.maxEnergy + 1));
  s = setPlayer(s, side, { ...p, maxEnergy, energy: maxEnergy, board: p.board.map((u) => ({ ...u, ready: true })) });
  s = { ...s, turn: side, turnNo: s.turnNo + 1, events: [...s.events, { type: "turn", side }] };
  return drawCards(s, side, 1);
}

function removeDead(s: BattleState): BattleState {
  const events: BattleEvent[] = [];
  const players = s.players.map((p, i) => {
    const alive = p.board.filter((u) => u.health > 0);
    for (const u of p.board) if (u.health <= 0) events.push({ type: "death", side: i as Side, uid: u.uid });
    return alive.length === p.board.length ? p : { ...p, board: alive };
  }) as [PlayerState, PlayerState];
  return { ...s, players, events: [...s.events, ...events] };
}

export function hasGuard(p: PlayerState): boolean {
  return p.board.some((u) => u.card.ability === "guard");
}

/* ───────────── 행동 ───────────── */

/** 지금 이 행동을 할 수 있는지 (안 되면 이유) */
export function checkAction(s: BattleState, a: Action): string | null {
  if (s.winner !== null) return "게임이 끝났어요.";
  const me = s.players[s.turn];
  const foe = s.players[other(s.turn)];
  if (a.type === "end") return null;
  if (a.type === "play") {
    const card = me.hand[a.handIndex];
    if (!card) return "그 카드가 없어요.";
    if (card.cost > me.energy) return "에너지가 모자라요.";
    if (me.board.length >= BOARD_MAX) return "필드가 꽉 찼어요.";
    return null;
  }
  const unit = me.board.find((u) => u.uid === a.attacker);
  if (!unit) return "그 카드가 없어요.";
  if (!unit.ready) return "이번 차례에는 공격할 수 없어요.";
  if (a.target === "leader") return hasGuard(foe) ? "지키기 카드부터 공격해야 해요." : null;
  const target = foe.board.find((u) => u.uid === a.target);
  if (!target) return "공격할 카드가 없어요.";
  if (hasGuard(foe) && target.card.ability !== "guard") return "지키기 카드부터 공격해야 해요.";
  return null;
}

/** 행동을 적용한 새 상태 (할 수 없는 행동이면 오류) */
export function applyAction(state: BattleState, a: Action): BattleState {
  const problem = checkAction(state, a);
  if (problem) throw new Error(problem);
  let s: BattleState = { ...state, events: [] };
  const side = s.turn;
  const foeSide = other(side);

  if (a.type === "end") return startTurn(s, foeSide);

  if (a.type === "play") {
    const me = s.players[side];
    const card = me.hand[a.handIndex];
    const uid = `u${s.nextUid}`;
    const unit: Unit = { uid, card, attack: card.attack, health: card.health, maxHealth: card.health, ready: card.ability === "charge" };
    s = setPlayer(s, side, {
      ...me,
      energy: me.energy - card.cost,
      hand: me.hand.filter((_, i) => i !== a.handIndex),
      board: [...me.board, unit],
    });
    s = { ...s, nextUid: s.nextUid + 1, events: [{ type: "play", side, uid }] };
    if (card.ability === "scheme") s = drawCards(s, side, 1);
    if (card.ability === "divine") {
      const foe = s.players[foeSide];
      s = setPlayer(s, foeSide, { ...foe, board: foe.board.map((u) => ({ ...u, health: u.health - 1 })) });
      s = { ...s, events: [...s.events, ...foe.board.map((u) => ({ type: "damage" as const, side: foeSide, target: u.uid, amount: 1 }))] };
      s = removeDead(s);
    }
    return s;
  }

  // 공격
  const me = s.players[side];
  const foe = s.players[foeSide];
  const attacker = me.board.find((u) => u.uid === a.attacker)!;
  s = setPlayer(s, side, { ...me, board: me.board.map((u) => (u.uid === attacker.uid ? { ...u, ready: false } : u)) });
  if (a.target === "leader") {
    s = setPlayer(s, foeSide, { ...foe, leader: { ...foe.leader, hp: foe.leader.hp - attacker.attack } });
    s = { ...s, events: [{ type: "damage", side: foeSide, target: "leader", amount: attacker.attack }] };
    return checkWinner(s);
  }
  const target = foe.board.find((u) => u.uid === a.target)!;
  s = setPlayer(s, foeSide, { ...foe, board: foe.board.map((u) => (u.uid === target.uid ? { ...u, health: u.health - attacker.attack } : u)) });
  const me2 = s.players[side];
  s = setPlayer(s, side, { ...me2, board: me2.board.map((u) => (u.uid === attacker.uid ? { ...u, health: u.health - target.attack } : u)) });
  s = {
    ...s,
    events: [
      { type: "damage", side: foeSide, target: target.uid, amount: attacker.attack },
      { type: "damage", side, target: attacker.uid, amount: target.attack },
    ],
  };
  return removeDead(s);
}

/** 지금 차례인 쪽이 할 수 있는 모든 행동 (토리, 화면 표시용) */
export function legalActions(s: BattleState): Action[] {
  if (s.winner !== null) return [];
  const me = s.players[s.turn];
  const foe = s.players[other(s.turn)];
  const out: Action[] = [];
  me.hand.forEach((_, i) => {
    const a: Action = { type: "play", handIndex: i };
    if (!checkAction(s, a)) out.push(a);
  });
  for (const u of me.board) {
    for (const t of ["leader", ...foe.board.map((f) => f.uid)]) {
      const a: Action = { type: "attack", attacker: u.uid, target: t };
      if (!checkAction(s, a)) out.push(a);
    }
  }
  out.push({ type: "end" });
  return out;
}
