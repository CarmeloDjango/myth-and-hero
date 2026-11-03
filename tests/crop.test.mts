/** 사진 자동 맞춤 계산 테스트 (DB 없음) */
import assert from "node:assert/strict";
import { test } from "node:test";

const { autoFrame, clampFrame, coverFrame, edgeColor } = await import("../src/lib/drawing/crop");

/** w×h 종이색 사진에 (x0,y0)-(x1,y1) 검은 사각형 */
function photo(w: number, h: number, box?: [number, number, number, number]) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const ink = box && x >= box[0] && x < box[2] && y >= box[1] && y < box[3];
      px.set(ink ? [20, 20, 20, 255] : [245, 243, 238, 255], i);
    }
  return px;
}

test("가장자리 색 = 종이 색", () => {
  assert.deepEqual(edgeColor(photo(100, 80), 100, 80), [245, 243, 238]);
});

test("종이 위 그림을 찾아 가운데로 맞춤", () => {
  const f = autoFrame(photo(200, 150, [120, 40, 170, 100]), 200, 150);
  assert.ok(Math.abs(f.cx - 145) < 2 && Math.abs(f.cy - 70) < 2, JSON.stringify(f));
  assert.ok(f.side >= 70 && f.side < 85, "그림 크기 + 여백");
});

test("그림이 없으면 가운데를 꽉 채움", () => {
  assert.deepEqual(autoFrame(photo(200, 150), 200, 150), coverFrame(200, 150));
});

test("정사각형은 사진 안쪽으로", () => {
  const f = clampFrame({ cx: 5, cy: 5, side: 100 }, 200, 150);
  assert.deepEqual(f, { cx: 50, cy: 50, side: 100 });
  const wide = clampFrame({ cx: 10, cy: 10, side: 190 }, 200, 150);
  assert.equal(wide.cy, 75, "사진보다 큰 방향은 가운데");
});
