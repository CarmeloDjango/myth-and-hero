/** 영웅 카드 배틀 규칙 테스트 (DB 없음) */
import assert from "node:assert/strict";
import { test } from "node:test";

const { cardStats } = await import("../src/lib/battle/cards");
const { applyAction, checkAction, legalActions, newBattle } = await import("../src/lib/battle/engine");
const { buildDeck, nextToriAction } = await import("../src/lib/battle/ai");
type CardDef = import("../src/lib/battle/cards").CardDef;
type BattleState = import("../src/lib/battle/engine").BattleState;

let n = 0;
const card = (cost: number, attack: number, health: number, ability: CardDef["ability"] = null, name = `카드${++n}`): CardDef => ({
  id: name, name, imageSrc: null, imageCover: false, tint: "#fff", kindName: null, seriesName: "테스트", isFamily: false, creatorId: null, cost, attack, health, ability,
});
const setup = (name: string, deck: CardDef[]) => ({ name, leader: { name, imageSrc: null, tint: "#fff" }, deck });
/** 손패·필드를 직접 정한 상태 (턴 0, 에너지 지정) */
function arrange(s: BattleState, side: 0 | 1, part: Partial<BattleState["players"][0]>): BattleState {
  const players = [...s.players] as BattleState["players"];
  players[side] = { ...players[side], ...part };
  return { ...s, players };
}
const unit = (uid: string, c: CardDef, ready = true) => ({ uid, card: c, attack: c.attack, health: c.health, maxHealth: c.health, ready });

test("카드 숫자: 비용=별-1, 힘의 합=비용×2+3, 한 가지만 높으면 공격 쪽", () => {
  assert.deepEqual(cardStats(5, [95, 97, 75, 62, 93]), { cost: 4, attack: 5, health: 6 }); // 관우: 골고루
  assert.deepEqual(cardStats(4, [85, 98, 30, 22, 45]), { cost: 3, attack: 7, health: 2 }); // 장비: 무력만
  assert.deepEqual(cardStats(1, [10, 0, 0, 0, 0]), { cost: 1, attack: 4, health: 1 }, "비용 최소 1");
  for (const r of [1, 2, 3, 4, 5, 9]) {
    const c = cardStats(r, [50, 60, 70, 80, 90]);
    assert.equal(c.attack + c.health, c.cost * 2 + 3);
    assert.ok(c.cost >= 1 && c.cost <= 4 && c.attack >= 1 && c.health >= 1);
  }
});

test("시작: 먼저 3장+1장, 나중 4장, 첫 차례 에너지 2", () => {
  const deck = Array.from({ length: 10 }, () => card(1, 1, 1));
  const s = newBattle(setup("나", deck), setup("토리", deck), 42);
  assert.equal(s.turn, 0);
  assert.equal(s.players[0].hand.length, 4);
  assert.equal(s.players[1].hand.length, 4);
  assert.equal(s.players[0].energy, 2);
  assert.equal(s.players[0].leader.hp, 20);
  // 같은 seed면 같은 손패
  assert.deepEqual(newBattle(setup("나", deck), setup("토리", deck), 42).players[0].hand.map((c) => c.id), s.players[0].hand.map((c) => c.id));
});

test("에너지는 차례마다 1씩 늘어 최대 6", () => {
  const deck = Array.from({ length: 10 }, () => card(9, 1, 1));
  let s = newBattle(setup("나", deck), setup("토리", deck), 1);
  for (let i = 0; i < 16; i++) s = applyAction(s, { type: "end" });
  assert.equal(s.players[0].maxEnergy, 6);
});

test("카드 내기: 에너지 모자라면 못 냄, 낸 차례엔 공격 못 함, 돌격은 가능", () => {
  const big = card(3, 2, 2);
  const rusher = card(1, 2, 1, "charge");
  let s = newBattle(setup("나", [big]), setup("토리", [card(1, 1, 1)]), 7);
  s = arrange(s, 0, { hand: [big, rusher], energy: 1 });
  assert.equal(checkAction(s, { type: "play", handIndex: 0 }), "에너지가 모자라요.");
  s = applyAction(s, { type: "play", handIndex: 1 });
  const u = s.players[0].board[0];
  assert.equal(u.ready, true, "돌격");
  assert.equal(s.players[0].energy, 0);
  s = arrange(s, 0, { hand: [big], energy: 3 });
  s = applyAction(s, { type: "play", handIndex: 0 });
  assert.equal(s.players[0].board[1].ready, false, "일반 카드는 다음 차례부터");
  assert.ok(checkAction(s, { type: "attack", attacker: s.players[0].board[1].uid, target: "leader" }));
});

test("공격: 카드끼리 서로 피해, 쓰러지면 사라짐, 대장 공격", () => {
  const a = card(1, 3, 2);
  const b = card(1, 1, 3);
  const filler = Array.from({ length: 10 }, () => card(1, 1, 1));
  let s = newBattle(setup("나", filler), setup("토리", filler), 3);
  s = arrange(s, 0, { board: [unit("x", a)] });
  s = arrange(s, 1, { board: [unit("y", b)] });
  s = applyAction(s, { type: "attack", attacker: "x", target: "y" });
  assert.equal(s.players[1].board.length, 0, "y 쓰러짐 (체력 3 - 3)");
  assert.equal(s.players[0].board[0].health, 1, "x는 1 피해");
  assert.equal(s.players[0].board[0].ready, false, "한 차례에 한 번");
  s = arrange(s, 0, { board: [{ ...s.players[0].board[0], ready: true }] });
  s = applyAction(s, { type: "attack", attacker: "x", target: "leader" });
  assert.equal(s.players[1].leader.hp, 17);
});

test("지키기: 지키기 카드부터 공격해야 함", () => {
  const a = card(1, 2, 2);
  const g = card(1, 1, 3, "guard");
  const o = card(1, 1, 1);
  let s = newBattle(setup("나", [a]), setup("토리", [g]), 3);
  s = arrange(s, 0, { board: [unit("x", a)] });
  s = arrange(s, 1, { board: [unit("g", g), unit("o", o)] });
  assert.match(checkAction(s, { type: "attack", attacker: "x", target: "leader" }) ?? "", /지키기/);
  assert.match(checkAction(s, { type: "attack", attacker: "x", target: "o" }) ?? "", /지키기/);
  assert.equal(checkAction(s, { type: "attack", attacker: "x", target: "g" }), null);
});

test("꾀는 1장 더 뽑고, 신의 힘은 상대 카드 모두에게 1 피해", () => {
  const sch = card(1, 1, 1, "scheme");
  const god = card(1, 1, 1, "divine");
  const weak = card(1, 1, 1);
  const tough = card(1, 1, 3);
  let s = newBattle(setup("나", [sch, god, weak, weak, weak, weak, weak, weak]), setup("토리", [weak]), 5);
  s = arrange(s, 0, { hand: [sch, god], energy: 2 });
  const deckBefore = s.players[0].deck.length;
  s = applyAction(s, { type: "play", handIndex: 0 });
  assert.equal(s.players[0].hand.length, 2, "꾀: 1장 내고 1장 뽑음");
  assert.equal(s.players[0].deck.length, deckBefore - 1);
  s = arrange(s, 1, { board: [unit("w", weak), unit("t", tough)] });
  s = applyAction(s, { type: "play", handIndex: s.players[0].hand.findIndex((c) => c.ability === "divine") });
  assert.deepEqual(s.players[1].board.map((u) => [u.uid, u.health]), [["t", 2]]);
  assert.ok(s.events.some((e) => e.type === "death"));
});

test("지침: 덱이 비면 대장이 1, 2, 3… 피해", () => {
  // 토리 덱 4장 = 시작 손패로 다 뽑음 → 토리 차례마다 뽑을 카드 없음
  const four = Array.from({ length: 4 }, () => card(1, 1, 1));
  let s = newBattle(setup("나", Array.from({ length: 10 }, () => card(1, 1, 1))), setup("토리", four), 9);
  const hp = () => s.players[1].leader.hp;
  const before = hp();
  s = applyAction(s, { type: "end" }); // 토리 차례: 덱 0장 → 1 피해
  assert.equal(hp(), before - 1);
  s = applyAction(s, { type: "end" });
  s = applyAction(s, { type: "end" }); // 2 피해
  assert.equal(hp(), before - 3);
});

test("대장 체력 0 → 게임 끝, 더는 행동 못 함", () => {
  const a = card(1, 5, 5);
  let s = newBattle(setup("나", [a]), setup("토리", [a]), 3);
  s = arrange(s, 0, { board: [unit("x", a)] });
  s = arrange(s, 1, { leader: { ...s.players[1].leader, hp: 4 } });
  s = applyAction(s, { type: "attack", attacker: "x", target: "leader" });
  assert.equal(s.winner, 0);
  assert.deepEqual(legalActions(s), []);
  assert.throws(() => applyAction(s, { type: "end" }));
});

test("덱 자동 만들기: 10장, 겹침 없음, 내 영웅 포함, 비용 고르게", () => {
  const pool = Array.from({ length: 30 }, (_, i) => card((i % 5) + 1, 2, 2, null, `p${i}`));
  const mine = card(5, 5, 5, null, "내영웅");
  const deck = buildDeck(pool, { include: [mine], seed: 3 });
  assert.equal(deck.length, 10);
  assert.equal(new Set(deck.map((c) => c.id)).size, 10);
  assert.ok(deck.includes(mine));
  for (let cost = 1; cost <= 5; cost++) assert.ok(deck.filter((c) => c.cost === cost).length >= 1, `비용 ${cost}`);
});

test("토리끼리 100판: 항상 규칙대로 하고, 게임이 끝남", () => {
  const pool = Array.from({ length: 40 }, (_, i) => card((i % 5) + 1, (i % 5) + 1, ((i * 3) % 6) + 1, (["guard", "charge", "scheme", "divine", null] as const)[i % 5], `c${i}`));
  const wins = [0, 0];
  for (let g = 0; g < 100; g++) {
    let s = newBattle(setup("A", buildDeck(pool, { seed: g })), setup("B", buildDeck(pool, { seed: g + 1000 })), g, (g % 2) as 0 | 1);
    let steps = 0;
    while (s.winner === null) {
      const a = nextToriAction(s);
      assert.equal(checkAction(s, a), null, `잘못된 행동 ${JSON.stringify(a)}`);
      s = applyAction(s, a);
      assert.ok(++steps < 2000, "끝나지 않는 게임");
    }
    wins[s.winner]++;
  }
  assert.equal(wins[0] + wins[1], 100);
});
