-- 부분 일치 검색용 trigram 확장 (Neon에서 지원)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX "Character_searchText_trgm_idx" ON "Character" USING GIN ("searchText" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Character_choseong_trgm_idx" ON "Character" USING GIN ("choseong" gin_trgm_ops);
