/** 트로피 계산 (순수 함수) */
import assert from "node:assert/strict";
import { test } from "node:test";

import { earnedTrophies, newTrophies, TROPHIES, type KidGame } from "../src/lib/battle/trophies";

const g = (o: Partial<KidGame> = {}): KidGame => ({ won: true, vsTori: true, toriLevel: "easy", finish: "attack", winnerHp: 10, turns: 16, playedMyHero: false, ...o });

test("트로피 id는 겹치지 않고 아이콘·이름·받는 방법이 있음", () => {
  assert.equal(new Set(TROPHIES.map((t) => t.id)).size, TROPHIES.length);
  for (const t of TROPHIES) assert.ok(t.icon && t.name && t.hint);
});

test("한 판도 안 했으면 트로피 없음, 지기만 하면 열 판 도전만", () => {
  assert.deepEqual(earnedTrophies([]), []);
  assert.deepEqual(earnedTrophies(Array.from({ length: 10 }, () => g({ won: false }))), ["games-10"]);
});

test("토리 승리 수: 5번 → 토리 잡기, 20번 → 토리 대장, 보통 5번 → 토리 박사", () => {
  assert.ok(earnedTrophies(Array.from({ length: 5 }, () => g())).includes("tori-5"));
  assert.ok(!earnedTrophies(Array.from({ length: 19 }, () => g())).includes("tori-20"));
  assert.ok(earnedTrophies(Array.from({ length: 20 }, () => g())).includes("tori-20"));
  const normal = Array.from({ length: 5 }, () => g({ toriLevel: "normal" }));
  assert.ok(earnedTrophies(normal).includes("normal-5"));
  // 가족 대결 승리는 토리 승리로 안 셈
  assert.ok(!earnedTrophies(Array.from({ length: 5 }, () => g({ vsTori: false, toriLevel: null }))).includes("tori-5"));
});

test("연승은 끊기면 다시 셈", () => {
  assert.ok(!earnedTrophies([g(), g(), g({ won: false }), g(), g()]).includes("streak-3"));
  assert.ok(earnedTrophies([g({ won: false }), g(), g(), g()]).includes("streak-3"));
});

test("예전 기록(값 없음)은 그 값이 필요한 트로피에 안 셈, 진 판의 기록도 안 셈", () => {
  assert.deepEqual(earnedTrophies([g({ winnerHp: null, finish: null, toriLevel: null })]), ["first-win"]);
  assert.deepEqual(earnedTrophies([g({ won: false, finish: "fire", winnerHp: 2, turns: 8, playedMyHero: true })]), []);
});

test("newTrophies: 이번 판으로 새로 받은 것만", () => {
  assert.deepEqual(newTrophies([], g({ finish: "fire" })), ["first-win", "fire-finish"]);
  assert.deepEqual(newTrophies([g({ finish: "fire" })], g({ finish: "fire" })), []);
});
