/**
 * 토리 (컴퓨터 상대) — 2학년이 이길 수 있을 만큼만 똑똑하게
 * 한 번에 행동 하나를 고릅니다. 화면은 이것을 조금씩 쉬며 반복해서 토리가 생각하는 것처럼 보여줍니다.
 *
 * 순서: 이길 수 있으면 대장 공격 → 낼 수 있는 가장 비싼 카드 내기 → 유리한 교환 → 대장 공격 → 차례 끝
 */
import { DECK_SIZE, type CardDef } from "./cards";
import { checkAction, hasGuard, shuffle, type Action, type BattleState } from "./engine";

export type ToriLevel = "easy" | "normal";

/**
 * level "easy"(기본): 낼 카드를 아무거나 고르고, 대장을 주로 때리고, 유리한 교환은 가끔만 (2학년이 이길 만큼)
 * level "normal": 가장 비싼 카드부터, 유리한 교환을 놓치지 않음
 * rnd: 테스트·시뮬레이션에서 같은 결과를 내기 위한 난수
 */
export function nextToriAction(s: BattleState, level: ToriLevel = "easy", rnd: () => number = Math.random): Action {
  const me = s.players[s.turn];
  const foe = s.players[1 - s.turn];
  const ready = me.board.filter((u) => u.ready);
  const ok = (a: Action) => !checkAction(s, a);

  // 1. 상대 대장을 쓰러뜨릴 수 있으면 바로
  if (!hasGuard(foe) && ready.length && ready.reduce((sum, u) => sum + u.attack, 0) >= foe.leader.hp) {
    return { type: "attack", attacker: ready[0].uid, target: "leader" };
  }

  // 2. 카드 내기: 낼 수 있는 것 중 가장 비싼 것 (상대 카드가 많으면 신의 힘 먼저)
  const playable = me.hand
    .map((card, handIndex) => ({ card, handIndex }))
    .filter(({ handIndex }) => ok({ type: "play", handIndex }));
  // 불꽃으로 상대 대장을 쓰러뜨릴 수 있으면 바로
  const finisher = playable.find(({ card }) => card.ability === "fire" && foe.leader.hp <= 2);
  if (finisher) return { type: "play", handIndex: finisher.handIndex };
  if (playable.length && level === "easy") return { type: "play", handIndex: playable[Math.floor(rnd() * playable.length)].handIndex };
  if (playable.length) {
    const score = (c: CardDef) => c.cost * 10 + (c.ability === "divine" ? foe.board.length * 6 : 0) + (c.ability === "fire" ? 5 : 0) + (c.ability === "guard" && me.leader.hp <= 10 ? 8 : 0);
    playable.sort((a, b) => score(b.card) - score(a.card));
    return { type: "play", handIndex: playable[0].handIndex };
  }

  // 3. 공격
  for (const u of ready) {
    const targets = foe.board.filter((t) => ok({ type: "attack", attacker: u.uid, target: t.uid }));
    // 지키기가 있으면 그중에서
    if (hasGuard(foe)) {
      const best = [...targets].sort((a, b) => Number(b.health <= u.attack) - Number(a.health <= u.attack) || b.attack - a.attack)[0];
      if (best) return { type: "attack", attacker: u.uid, target: best.uid };
      continue;
    }
    // 쉬운 토리는 열에 일곱은 그냥 대장을 때림
    if (level === "easy" && rnd() < 0.7) return { type: "attack", attacker: u.uid, target: "leader" };
    // 이기고 살아남는 교환, 아니면 강한 카드와 맞바꾸기
    const win = targets.filter((t) => t.health <= u.attack && t.attack < u.health).sort((a, b) => b.attack - a.attack)[0];
    if (win) return { type: "attack", attacker: u.uid, target: win.uid };
    const trade = targets.filter((t) => t.health <= u.attack && t.attack >= 3 && t.attack >= u.attack).sort((a, b) => b.attack - a.attack)[0];
    if (trade) return { type: "attack", attacker: u.uid, target: trade.uid };
    return { type: "attack", attacker: u.uid, target: "leader" };
  }
  return { type: "end" };
}

/**
 * 덱 자동으로 만들기: 비용이 고르게 섞이도록(1~5 각 2장쯤) 고르고, 꼭 넣을 카드(내가 만든 영웅)는 먼저 넣습니다.
 */
export function buildDeck(pool: CardDef[], { include = [], size = DECK_SIZE, seed = Date.now() }: { include?: CardDef[]; size?: number; seed?: number } = {}): CardDef[] {
  const rng = { seed };
  const deck: CardDef[] = include.slice(0, size);
  const used = new Set(deck.map((c) => c.id));
  const rest = shuffle(pool.filter((c) => !used.has(c.id)), rng);
  const perCost = Math.max(1, Math.ceil(size / 5));
  for (let cost = 1; cost <= 5 && deck.length < size; cost++) {
    const have = deck.filter((c) => c.cost === cost).length;
    for (const c of rest.filter((c) => c.cost === cost && !used.has(c.id)).slice(0, Math.max(0, perCost - have))) {
      if (deck.length >= size) break;
      deck.push(c);
      used.add(c.id);
    }
  }
  // 비용별로 모자라면 아무거나 채우기
  for (const c of rest) {
    if (deck.length >= size) break;
    if (!used.has(c.id)) {
      deck.push(c);
      used.add(c.id);
    }
  }
  return deck;
}
