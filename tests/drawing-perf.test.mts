/** 그리기 가볍게 하기: 점 줄이기 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { keepPoint, STROKE_POINTS_SPLIT } from "../src/lib/drawing/perf";
import { strokesSchema } from "../src/lib/heroes/rules";

test("첫 점은 항상 남김", () => {
  assert.equal(keepPoint(undefined, [10, 10, 0.5]), true);
});

test("2픽셀보다 가까운 점은 버리고, 멀면 남김", () => {
  assert.equal(keepPoint([10, 10, 0.5], [11, 10.5, 0.5]), false);
  assert.equal(keepPoint([10, 10, 0.5], [12, 10, 0.5]), true);
  assert.equal(keepPoint([10, 10, 0.5], [10, 7.9, 0.5]), true);
});

test("확대해서 그리면 더 촘촘하게 (4배면 0.5픽셀)", () => {
  assert.equal(keepPoint([10, 10, 0.5], [11, 10, 0.5], 1), false);
  assert.equal(keepPoint([10, 10, 0.5], [10.6, 10, 0.5], 4), true);
});

test("필압이 크게 바뀌면 가까워도 남김", () => {
  assert.equal(keepPoint([10, 10, 0.3], [10.5, 10, 0.6]), true);
  assert.equal(keepPoint([10, 10, 0.3], [10.5, 10, 0.35]), false);
});

test("나눠서 확정하는 점 수는 서버가 받는 한 획 한도 안", () => {
  const stroke = { tool: "pen", color: "#000000", size: 8, simulatePressure: false, points: Array.from({ length: STROKE_POINTS_SPLIT }, (_, i) => [i % 1000, 10, 0.5]) };
  assert.ok(strokesSchema.safeParse([stroke]).success);
});
