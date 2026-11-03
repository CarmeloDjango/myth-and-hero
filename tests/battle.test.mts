/** 영웅 카드 배틀 규칙 테스트 (DB 없음) */
import assert from "node:assert/strict";
import { test } from "node:test";

const { familyCardStats, KIND_ABILITY, OFFICIAL_CARDS, RULES, STAT_CAP, statBudget } = await import("../src/lib/battle/cards");
const { SEED_SERIES } = await import("../prisma/seed-data");
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

test("공식 카드: 모든 시드 인물이 표에 있고, 힘의 합이 곡선에 맞고, 최대 6", () => {
  const seeded = SEED_SERIES.flatMap((ser) => ser.characters);
  assert.equal(Object.keys(OFFICIAL_CARDS).length, seeded.length);
  for (const c of seeded) {
    const card = OFFICIAL_CARDS[c.slug];
    assert.ok(card, `${c.name} 카드 없음`);
    const [cost, attack, health] = card;
    assert.equal(attack + health, statBudget(cost, !!KIND_ABILITY[c.kind]), `${c.name} ${cost}/${attack}/${health}`);
    assert.ok(attack >= 1 && health >= 1 && attack <= STAT_CAP && health <= STAT_CAP, c.name);
  }
  const perCost = [1, 2, 3, 4, 5].map((k) => Object.values(OFFICIAL_CARDS).filter(([cost]) => cost === k).length);
  assert.deepEqual(perCost, [2, 6, 11, 9, 6]);
});

test("아이 영웅 카드: 능력치 합으로 비용, 곡선·한도 지킴", () => {
  assert.equal(familyCardStats([100, 100, 100, 50, 0], false).cost, 5, "350점 가득");
  assert.equal(familyCardStats([50, 50, 50, 50, 50], false).cost, 4, "250점");
  assert.equal(familyCardStats([10, 0, 0, 0, 0], false).cost, 1);
  for (const stats of [[100, 100, 100, 50, 0], [70, 70, 70, 70, 70], [100, 0, 0, 0, 0], [0, 0, 0, 0, 0]]) {
    for (const ab of [true, false]) {
      const c = familyCardStats(stats, ab);
      assert.equal(c.attack + c.health, statBudget(c.cost, ab), JSON.stringify({ stats, ab, c }));
      assert.ok(c.attack <= STAT_CAP && c.health <= STAT_CAP && c.attack >= 1 && c.health >= 1);
    }
  }
  const spiky = familyCardStats([100, 100, 100, 50, 0], false);
  const even = familyCardStats([70, 70, 70, 70, 70], false);
  assert.ok(spiky.attack > even.attack, "한 가지만 높으면 공격 쪽");
});

test("시작: 먼저 3장+1장, 나중 4장, 첫 차례 에너지 1, 나중 쪽은 첫 차례 보너스", () => {
  const deck = Array.from({ length: 10 }, () => card(1, 1, 1));
  const s = newBattle(setup("나", deck), setup("토리", deck), 42);
  assert.equal(s.turn, 0);
  assert.equal(s.players[0].hand.length, 4);
  assert.equal(s.players[1].hand.length, 4);
  assert.equal(s.players[0].energy, RULES.startEnergy);
  assert.equal(s.players[0].leader.hp, RULES.leaderHp);
  const t = applyAction(s, { type: "end" });
  assert.equal(t.players[1].energy, RULES.startEnergy + RULES.secondBonus, "나중 쪽 첫 차례 보너스");
  const u = applyAction(applyAction(t, { type: "end" }), { type: "end" });
  assert.equal(u.players[1].energy, u.players[1].maxEnergy, "보너스는 한 번만");
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
  assert.equal(s.players[1].leader.hp, RULES.leaderHp - 3);
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

test("위기의 힘: 대장 체력이 낮으면 차례 시작에 에너지 +1", () => {
  const deck = Array.from({ length: 10 }, () => card(1, 1, 1));
  let s = newBattle(setup("나", deck), setup("토리", deck), 4);
  s = applyAction(s, { type: "end" });
  s = arrange(s, 0, { leader: { ...s.players[0].leader, hp: RULES.crisisHp } });
  s = applyAction(s, { type: "end" });
  assert.equal(s.players[0].energy, s.players[0].maxEnergy + RULES.crisisEnergy);
  assert.ok(s.events.some((e) => e.type === "crisis"));
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
      const a = nextToriAction(s, g % 2 ? "easy" : "normal");
      assert.equal(checkAction(s, a), null, `잘못된 행동 ${JSON.stringify(a)}`);
      s = applyAction(s, a);
      assert.ok(++steps < 2000, "끝나지 않는 게임");
    }
    wins[s.winner]++;
  }
  assert.equal(wins[0] + wins[1], 100);
});
