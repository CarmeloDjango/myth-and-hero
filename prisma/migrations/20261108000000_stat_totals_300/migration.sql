-- 모든 인물 능력치 합 300 이하, 별 = 능력치 합의 구간 (★5 261~300, ★4 221~260, ★3 171~220, ★2 121~170, ★1 120 이하)
-- 1) 공식 인물: 새 능력치 (원래 값을 별 구간에 맞게 줄이되 잘하는 능력치는 덜 줄임)
UPDATE "Character" SET "stat1" = 23, "stat2" = 15, "stat3" = 30, "stat4" = 23, "stat5" = 29 WHERE "familyId" IS NULL AND "slug" = 'hermes';
UPDATE "Character" SET "stat1" = 29, "stat2" = 30, "stat3" = 16, "stat4" = 5, "stat5" = 5 WHERE "familyId" IS NULL AND "slug" = 'dong-zhuo';
UPDATE "Character" SET "stat1" = 33, "stat2" = 28, "stat3" = 43, "stat4" = 34, "stat5" = 32 WHERE "familyId" IS NULL AND "slug" = 'odysseus';
UPDATE "Character" SET "stat1" = 30, "stat2" = 41, "stat3" = 26, "stat4" = 21, "stat5" = 8 WHERE "familyId" IS NULL AND "slug" = 'medusa';
UPDATE "Character" SET "stat1" = 28, "stat2" = 62, "stat3" = 9, "stat4" = 5, "stat5" = 25 WHERE "familyId" IS NULL AND "slug" = 'xu-chu';
UPDATE "Character" SET "stat1" = 39, "stat2" = 31, "stat3" = 37, "stat4" = 28, "stat5" = 31 WHERE "familyId" IS NULL AND "slug" = 'lu-meng';
UPDATE "Character" SET "stat1" = 41, "stat2" = 50, "stat3" = 29, "stat4" = 5, "stat5" = 21 WHERE "familyId" IS NULL AND "slug" = 'gan-ning';
UPDATE "Character" SET "stat1" = 34, "stat2" = 25, "stat3" = 26, "stat4" = 29, "stat5" = 42 WHERE "familyId" IS NULL AND "slug" = 'yuan-shao';
UPDATE "Character" SET "stat1" = 45, "stat2" = 41, "stat3" = 45, "stat4" = 33, "stat5" = 55 WHERE "familyId" IS NULL AND "slug" = 'apollo';
UPDATE "Character" SET "stat1" = 43, "stat2" = 44, "stat3" = 38, "stat4" = 50, "stat5" = 43 WHERE "familyId" IS NULL AND "slug" = 'artemis';
UPDATE "Character" SET "stat1" = 34, "stat2" = 44, "stat3" = 41, "stat4" = 53, "stat5" = 45 WHERE "familyId" IS NULL AND "slug" = 'perseus';
UPDATE "Character" SET "stat1" = 39, "stat2" = 45, "stat3" = 41, "stat4" = 53, "stat5" = 41 WHERE "familyId" IS NULL AND "slug" = 'theseus';
UPDATE "Character" SET "stat1" = 29, "stat2" = 95, "stat3" = 7, "stat4" = 40, "stat5" = 5 WHERE "familyId" IS NULL AND "slug" = 'minotaur';
UPDATE "Character" SET "stat1" = 58, "stat2" = 70, "stat3" = 14, "stat4" = 5, "stat5" = 50 WHERE "familyId" IS NULL AND "slug" = 'ma-chao';
UPDATE "Character" SET "stat1" = 54, "stat2" = 63, "stat3" = 26, "stat4" = 20, "stat5" = 41 WHERE "familyId" IS NULL AND "slug" = 'huang-zhong';
UPDATE "Character" SET "stat1" = 54, "stat2" = 22, "stat3" = 52, "stat4" = 49, "stat5" = 43 WHERE "familyId" IS NULL AND "slug" = 'sima-yi';
UPDATE "Character" SET "stat1" = 53, "stat2" = 54, "stat3" = 22, "stat4" = 32, "stat5" = 49 WHERE "familyId" IS NULL AND "slug" = 'xiahou-dun';
UPDATE "Character" SET "stat1" = 37, "stat2" = 28, "stat3" = 41, "stat4" = 50, "stat5" = 57 WHERE "familyId" IS NULL AND "slug" = 'sun-quan';
UPDATE "Character" SET "stat1" = 52, "stat2" = 52, "stat3" = 29, "stat4" = 30, "stat5" = 52 WHERE "familyId" IS NULL AND "slug" = 'sun-ce';
UPDATE "Character" SET "stat1" = 65, "stat2" = 65, "stat3" = 35, "stat4" = 46, "stat5" = 44 WHERE "familyId" IS NULL AND "slug" = 'poseidon';
UPDATE "Character" SET "stat1" = 70, "stat2" = 62, "stat3" = 54, "stat4" = 39, "stat5" = 24 WHERE "familyId" IS NULL AND "slug" = 'hades';
UPDATE "Character" SET "stat1" = 49, "stat2" = 65, "stat3" = 26, "stat4" = 62, "stat5" = 55 WHERE "familyId" IS NULL AND "slug" = 'achilles';
UPDATE "Character" SET "stat1" = 44, "stat2" = 41, "stat3" = 43, "stat4" = 47, "stat5" = 76 WHERE "familyId" IS NULL AND "slug" = 'liu-bei';
UPDATE "Character" SET "stat1" = 86, "stat2" = 99, "stat3" = 11, "stat4" = 6, "stat5" = 24 WHERE "familyId" IS NULL AND "slug" = 'zhang-fei';
UPDATE "Character" SET "stat1" = 58, "stat2" = 10, "stat3" = 67, "stat4" = 62, "stat5" = 58 WHERE "familyId" IS NULL AND "slug" = 'zhuge-liang';
UPDATE "Character" SET "stat1" = 62, "stat2" = 68, "stat3" = 43, "stat4" = 31, "stat5" = 49 WHERE "familyId" IS NULL AND "slug" = 'zhao-yun';
UPDATE "Character" SET "stat1" = 66, "stat2" = 64, "stat3" = 46, "stat4" = 26, "stat5" = 49 WHERE "familyId" IS NULL AND "slug" = 'zhang-liao';
UPDATE "Character" SET "stat1" = 62, "stat2" = 33, "stat3" = 60, "stat4" = 48, "stat5" = 57 WHERE "familyId" IS NULL AND "slug" = 'zhou-yu';
UPDATE "Character" SET "stat1" = 70, "stat2" = 63, "stat3" = 51, "stat4" = 57, "stat5" = 59 WHERE "familyId" IS NULL AND "slug" = 'zeus';
UPDATE "Character" SET "stat1" = 59, "stat2" = 51, "stat3" = 70, "stat4" = 63, "stat5" = 57 WHERE "familyId" IS NULL AND "slug" = 'athena';
UPDATE "Character" SET "stat1" = 50, "stat2" = 79, "stat3" = 28, "stat4" = 76, "stat5" = 61 WHERE "familyId" IS NULL AND "slug" = 'heracles';
UPDATE "Character" SET "stat1" = 72, "stat2" = 76, "stat3" = 45, "stat4" = 31, "stat5" = 69 WHERE "familyId" IS NULL AND "slug" = 'guan-yu';
UPDATE "Character" SET "stat1" = 67, "stat2" = 38, "stat3" = 61, "stat4" = 65, "stat5" = 67 WHERE "familyId" IS NULL AND "slug" = 'cao-cao';
UPDATE "Character" SET "stat1" = 100, "stat2" = 100, "stat3" = 18, "stat4" = 5, "stat5" = 43 WHERE "familyId" IS NULL AND "slug" = 'lu-bu';

-- 2) 아이가 만든 영웅 중 300을 넘는 것(예전 350점)은 비율대로 300 이하로
UPDATE "Character" SET
  "stat1" = FLOOR("stat1" * 300.0 / ("stat1" + "stat2" + "stat3" + "stat4" + "stat5")),
  "stat2" = FLOOR("stat2" * 300.0 / ("stat1" + "stat2" + "stat3" + "stat4" + "stat5")),
  "stat3" = FLOOR("stat3" * 300.0 / ("stat1" + "stat2" + "stat3" + "stat4" + "stat5")),
  "stat4" = FLOOR("stat4" * 300.0 / ("stat1" + "stat2" + "stat3" + "stat4" + "stat5")),
  "stat5" = FLOOR("stat5" * 300.0 / ("stat1" + "stat2" + "stat3" + "stat4" + "stat5"))
WHERE "familyId" IS NOT NULL AND ("stat1" + "stat2" + "stat3" + "stat4" + "stat5") > 300;

-- 3) 아이가 만든 영웅의 별을 새 구간으로 (heroStars와 같은 식)
UPDATE "Character" SET "rarity" = CASE
  WHEN ("stat1" + "stat2" + "stat3" + "stat4" + "stat5") >= 261 THEN 5
  WHEN ("stat1" + "stat2" + "stat3" + "stat4" + "stat5") >= 221 THEN 4
  WHEN ("stat1" + "stat2" + "stat3" + "stat4" + "stat5") >= 171 THEN 3
  WHEN ("stat1" + "stat2" + "stat3" + "stat4" + "stat5") >= 121 THEN 2
  ELSE 1 END
WHERE "familyId" IS NOT NULL;
