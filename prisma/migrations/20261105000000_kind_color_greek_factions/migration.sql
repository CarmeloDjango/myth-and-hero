-- 종류에 카드 배경색 추가 (편이 없는 세계관용)
ALTER TABLE "CharacterKind" ADD COLUMN "color" TEXT;

-- 그리스신화: 편(올림포스·영웅·괴물)이 종류(신·영웅·괴물)와 겹쳐서 편을 없애고, 같은 색을 종류에 줍니다.
UPDATE "CharacterKind" SET "color" = '#f3e1ff' WHERE "name" = '신' AND "seriesId" IN (SELECT "id" FROM "Series" WHERE "slug" = 'greek-myth' AND "familyId" IS NULL);
UPDATE "CharacterKind" SET "color" = '#ddf4ff' WHERE "name" = '영웅' AND "seriesId" IN (SELECT "id" FROM "Series" WHERE "slug" = 'greek-myth' AND "familyId" IS NULL);
UPDATE "CharacterKind" SET "color" = '#ffe2cc' WHERE "name" = '괴물' AND "seriesId" IN (SELECT "id" FROM "Series" WHERE "slug" = 'greek-myth' AND "familyId" IS NULL);
-- 인물의 factionId는 외래키(ON DELETE SET NULL)로 비워집니다.
DELETE FROM "Faction" WHERE "seriesId" IN (SELECT "id" FROM "Series" WHERE "slug" = 'greek-myth' AND "familyId" IS NULL);

-- 원어 이름(한자, 그리스 문자)은 화면에 쓰지 않으므로 지웁니다.
UPDATE "Character" SET "originalName" = NULL WHERE "familyId" IS NULL;
