-- 별(★) = 카드 배틀 비용(⚡): 공식 인물은 카드 표(OFFICIAL_CARDS)의 비용으로
UPDATE "Character" SET "rarity" = CASE "slug"
  WHEN 'zeus' THEN 5
  WHEN 'athena' THEN 5
  WHEN 'heracles' THEN 5
  WHEN 'poseidon' THEN 4
  WHEN 'hades' THEN 4
  WHEN 'achilles' THEN 4
  WHEN 'apollo' THEN 3
  WHEN 'artemis' THEN 3
  WHEN 'perseus' THEN 3
  WHEN 'theseus' THEN 3
  WHEN 'minotaur' THEN 3
  WHEN 'odysseus' THEN 2
  WHEN 'medusa' THEN 2
  WHEN 'hermes' THEN 1
  WHEN 'guan-yu' THEN 5
  WHEN 'lu-bu' THEN 5
  WHEN 'cao-cao' THEN 5
  WHEN 'liu-bei' THEN 4
  WHEN 'zhang-fei' THEN 4
  WHEN 'zhao-yun' THEN 4
  WHEN 'zhang-liao' THEN 4
  WHEN 'zhuge-liang' THEN 4
  WHEN 'zhou-yu' THEN 4
  WHEN 'ma-chao' THEN 3
  WHEN 'huang-zhong' THEN 3
  WHEN 'xiahou-dun' THEN 3
  WHEN 'sima-yi' THEN 3
  WHEN 'sun-quan' THEN 3
  WHEN 'sun-ce' THEN 3
  WHEN 'xu-chu' THEN 2
  WHEN 'lu-meng' THEN 2
  WHEN 'gan-ning' THEN 2
  WHEN 'yuan-shao' THEN 2
  WHEN 'dong-zhuo' THEN 1
  ELSE "rarity" END
WHERE "familyId" IS NULL AND "slug" IN ('zeus', 'athena', 'heracles', 'poseidon', 'hades', 'achilles', 'apollo', 'artemis', 'perseus', 'theseus', 'minotaur', 'odysseus', 'medusa', 'hermes', 'guan-yu', 'lu-bu', 'cao-cao', 'liu-bei', 'zhang-fei', 'zhao-yun', 'zhang-liao', 'zhuge-liang', 'zhou-yu', 'ma-chao', 'huang-zhong', 'xiahou-dun', 'sima-yi', 'sun-quan', 'sun-ce', 'xu-chu', 'lu-meng', 'gan-ning', 'yuan-shao', 'dong-zhuo');

-- 아이가 만든 영웅: 능력치 합으로 (300 = ★5, heroStars와 같은 식)
UPDATE "Character" SET "rarity" = LEAST(5, GREATEST(1, ROUND(("stat1" + "stat2" + "stat3" + "stat4" + "stat5")::numeric / 300 * 4) + 1))
WHERE "familyId" IS NOT NULL;
