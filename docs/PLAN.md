# myth-and-hero: 신화·역사 인물 도감 구현 계획

초등학교 2학년 아이를 위한 신화·역사 인물 도감 웹서비스입니다.
일러스트 카드로 인물을 보여주고, 삼국지식 능력치(무력, 지력 등)와 인물 열전을 담습니다.

- **세계관:** 그리스신화, 삼국지, 수호지, 초한지 등 (계속 추가)
- **핵심 기능:** 카드형 UI, 서버사이드 검색·필터, 인피니트 스크롤, 관리자 인물 등록

---

## 1. 서비스 개요

**대상:** 초등학교 2학년 (태블릿 사용을 기준으로 설계)

**핵심 경험:** 세계관 고르기 → 카드 목록 둘러보기, 검색하기 → 카드 열어서 능력치와 열전 읽기 → 마음에 든 인물 모으기

```
홈 (세계관 선택: 그리스신화 / 삼국지 / 수호지 / 초한지 …)
 └─ 도감 목록 (카드 그리드 + 검색 + 필터 + 인피니트 스크롤)
     └─ 인물 상세 (큰 일러스트 카드, 능력치, 열전, 관계, 재미있는 사실)
관리자
 └─ 인물·세계관·진영 관리, 이미지 업로드, 여러 명 한꺼번에 등록(JSON/CSV)
```

---

## 2. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | Next.js 16 (App Router, React 19.2) | Turbopack 기본. `params`/`searchParams`는 Promise로 받음 |
| 데이터 변경 | Server Actions | 관리자 CRUD. 목록 조회도 서버 액션으로 처리 (5장 참고) |
| DB / ORM | PostgreSQL + Prisma 7 | `prisma.config.ts`, `@prisma/adapter-pg` 드라이버 어댑터 사용 |
| 클라이언트 상태 | TanStack Query v5 | `useInfiniteQuery`, SSR 하이드레이션 |
| URL 상태 | nuqs | 검색어·필터를 URL에 저장해 뒤로가기와 공유를 지원 |
| 폼과 검증 | react-hook-form + zod | 같은 zod 스키마를 클라이언트와 서버 액션에서 함께 사용 |
| 인증 | Better Auth 또는 Auth.js | 관리자만 로그인. `proxy.ts`(Next 16의 middleware 대체)로 `/admin` 보호 |
| 이미지 저장소 | Cloudflare R2, S3 또는 Vercel Blob | presigned URL로 브라우저에서 직접 업로드. 표시는 `next/image` |
| UI | Tailwind v4 + shadcn/ui + motion | 카드 뒤집기, 등급 반짝임 효과 |
| 스크롤 감지 | react-intersection-observer | 무한 스크롤 트리거 |

---

## 3. 데이터 모델 (Prisma)

### 능력치 설계

능력치는 **공통 5개 컬럼을 두고, 이름만 세계관마다 바꾸는 방식**으로 합니다.
EAV(능력치를 행 단위로 저장하는 방식)보다 정렬, 인덱스, 쿼리가 훨씬 단순합니다.

| 컬럼 | 삼국지 | 그리스신화 (예시) |
|---|---|---|
| `leadership` | 통솔 | 권능 |
| `power` | 무력 | 힘 |
| `intellect` | 지력 | 지혜 |
| `politics` | 정치 | 영향력 |
| `charm` | 매력 | 매력 |

라벨은 `Series.statLabels`(JSON)에 저장합니다.

### 스키마 초안

```prisma
model Series {                      // 세계관
  id          String   @id @default(cuid())
  slug        String   @unique      // "three-kingdoms"
  name        String                // "삼국지"
  description String
  coverImage  String?
  themeColor  String?
  statLabels  Json                  // {"leadership":"통솔","power":"무력",...}
  order       Int      @default(0)
  factions    Faction[]
  characters  Character[]
}

model Faction {                     // 진영/소속: 촉·위·오, 올림포스 12신, 양산박…
  id         String @id @default(cuid())
  seriesId   String
  series     Series @relation(fields: [seriesId], references: [id])
  name       String
  color      String?
  emblem     String?
  characters Character[]
  @@unique([seriesId, name])
}

enum Role { GOD HERO MONSTER GENERAL STRATEGIST RULER OUTLAW OTHER }

model Character {
  id           String   @id @default(cuid())
  slug         String   @unique
  seriesId     String
  series       Series   @relation(fields: [seriesId], references: [id])
  factionId    String?
  faction      Faction? @relation(fields: [factionId], references: [id])

  name         String               // 관우
  originalName String?              // 關羽 / Ζεύς
  title        String?              // 미염공, 천둥의 신
  aliases      String[]             // 운장, 관운장
  searchText   String               // 이름+별칭+칭호 (검색용, 서버에서 생성)
  choseong     String               // ㄱㅇ ㅇㅈ … (초성 검색용, 서버에서 생성)

  role         Role
  rarity       Int      @default(1) // 1~5성, 카드 테두리 색
  leadership   Int      @default(0) // 0~100
  power        Int      @default(0)
  intellect    Int      @default(0)
  politics     Int      @default(0)
  charm        Int      @default(0)

  summary      String               // 한 줄 소개 (카드 앞면)
  biography    String               // 인물 열전 (마크다운, 2학년 눈높이)
  funFacts     String[]             // "알고 있었나요?"
  imageUrl     String
  thumbUrl     String?
  era          String?              // "후한 말", "올림포스 시대"

  tags          CharacterTag[]
  relationsFrom Relation[] @relation("from")
  relationsTo   Relation[] @relation("to")

  published    Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([seriesId, factionId, role])
  @@index([seriesId, power(sort: Desc), id])
  @@index([seriesId, intellect(sort: Desc), id])
  // 나머지 능력치 정렬용 인덱스도 같은 형태로 추가
}

model Tag {                         // 특기: 궁술, 지략, 바다, 변신…
  id         String @id @default(cuid())
  name       String @unique
  characters CharacterTag[]
}

model CharacterTag {
  characterId String
  tagId       String
  character   Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
  tag         Tag       @relation(fields: [tagId], references: [id])
  @@id([characterId, tagId])
}

enum RelationType { PARENT CHILD SPOUSE SIBLING SWORN_BROTHER LORD SUBORDINATE RIVAL MENTOR }

model Relation {                    // 관계: 유비-관우 의형제, 제우스-아테나 부모
  id     String @id @default(cuid())
  fromId String
  toId   String
  type   RelationType
  note   String?
  from   Character @relation("from", fields: [fromId], references: [id], onDelete: Cascade)
  to     Character @relation("to",   fields: [toId],   references: [id], onDelete: Cascade)
  @@unique([fromId, toId, type])
}
```

---

## 4. 서버사이드 검색과 필터

### 검색
- PostgreSQL `pg_trgm` 확장과 `searchText` 컬럼의 GIN trigram 인덱스로 부분 일치를 처리합니다. "관"으로도, "운장"으로도 찾을 수 있습니다.
  확장과 인덱스는 Prisma 마이그레이션에 raw SQL로 추가합니다.
- **초성 검색:** "ㅈㅇㅅ"를 치면 제우스가 나옵니다. 저장할 때 `choseong`을 만들어 두고, 입력이 모두 초성이면 이 컬럼으로 검색합니다.
- 입력은 300ms debounce를 걸고 URL `?q=`에 반영합니다.

### 필터 (모두 URL 파라미터)
- 세계관(series), 진영(faction), 역할(role), 등급(rarity), 특기 태그(tags)
- 정렬: 이름순, 최신순, 능력치 높은 순(무력, 지력 등)

### 페이지네이션: 커서 방식
- 정렬 기준과 `id`를 함께 써서 순서를 고정합니다 (예: `power desc, id desc`).
- offset 방식보다 빠르고, 스크롤하는 도중 데이터가 추가돼도 중복이나 누락이 생기지 않습니다.

```ts
// lib/queries/characters.ts
export async function getCharacters(input: CharacterQuery) {
  const { q, seriesId, factionId, role, sort = "name", cursor, take = 24 } =
    characterQuerySchema.parse(input);

  const items = await prisma.character.findMany({
    where: {
      published: true, seriesId, factionId, role,
      ...(q && buildSearchWhere(q)),
    },
    orderBy: sortMap[sort],         // 예: [{ power: "desc" }, { id: "desc" }]
    take: take + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    select: cardSelect,             // 카드에 필요한 필드만 가져옴
  });

  const hasMore = items.length > take;
  return {
    items: items.slice(0, take),
    nextCursor: hasMore ? items[take - 1].id : null,
  };
}
```

---

## 5. 데이터 흐름 (SSR + 인피니트 스크롤)

```
page.tsx (서버 컴포넌트)
  ├─ searchParams await → queryClient.prefetchInfiniteQuery(첫 페이지)
  └─ <HydrationBoundary state={dehydrate(queryClient)}>
        <CharacterGrid />   ← 클라이언트: useInfiniteQuery + nuqs useQueryState
```

- **queryKey:** `["characters", { q, series, faction, role, sort }]`. 필터가 바뀌면 자동으로 새로 불러옵니다.
- **queryFn:** 서버 액션 `fetchCharactersAction(params, cursor)`가 `getCharacters`를 호출합니다.
  - 서버 액션은 순차로 실행되지만, 인피니트 스크롤은 원래 한 페이지씩 요청하므로 문제가 없습니다.
  - 서버 액션은 POST라 HTTP 캐시를 쓸 수 없습니다. 나중에 CDN 캐싱이 필요해지면 `getCharacters`를 감싼 GET Route Handler로 바꾸면 됩니다. 함수를 분리해 두었으므로 교체 비용은 거의 없습니다.
- `placeholderData: keepPreviousData`를 써서 필터를 바꿀 때 화면이 깜빡이지 않게 합니다.
- 목록 끝의 센티넬 요소가 화면에 보이면 `fetchNextPage()`를 호출합니다.

---

## 6. 관리자 기능

| 기능 | 구현 |
|---|---|
| 인물 등록·수정·삭제 | 서버 액션 + zod 검증. 실행 후 `revalidateTag("characters")` / `updateTag`로 캐시 갱신 |
| 이미지 업로드 | presigned URL을 발급하는 액션 → 브라우저에서 R2/S3로 직접 업로드. 썸네일은 `next/image` 또는 업로드할 때 sharp로 생성 |
| 실시간 미리보기 | 폼 오른쪽에 실제 카드 컴포넌트를 렌더링해, 입력하는 대로 확인 |
| 능력치 입력 | 0~100 슬라이더. 세계관을 고르면 라벨이 자동으로 바뀜 |
| 관계 설정 | 인물 검색 콤보박스 + 관계 유형 선택 |
| 세계관·진영·태그 관리 | 각각 간단한 CRUD |
| 일괄 등록 | JSON/CSV 업로드 → 미리보기 → 확정. 삼국지처럼 인물이 많을 때 필수 |
| 공개 여부 | `published` 토글. 초안으로 저장해 두고 검수 후 공개 |
| 접근 제한 | `proxy.ts`로 `/admin` 접근을 막고, **모든 서버 액션 안에서도 권한을 다시 확인** (서버 액션은 외부에서 직접 호출할 수 있음) |

- `searchText`, `choseong`, `slug`는 저장 액션 안에서 서버가 자동으로 만듭니다.

---

## 7. 카드 UI와 아이 맞춤 UX

> 시각 디자인(색상, 폰트, 컴포넌트)은 Duolingo 스타일로 확정했습니다. 자세한 내용은 [DESIGN.md](./DESIGN.md)를 따릅니다.

### 카드
- **앞면:** 일러스트, 이름, 칭호, 진영 엠블럼, 별 등급
  - 등급별 테두리: 1성은 회색, 5성은 금색 반짝임
- **뒷면 (탭하면 뒤집힘):** 능력치 막대 5개와 한 줄 소개

### 인물 상세 페이지
- 큰 일러스트
- 능력치: 막대 또는 오각형 레이더 차트. 숫자보다 색과 길이로 보여줌
- 📜 인물 열전: 짧은 문단 위주로 쓰고, 어려운 한자어는 풀어 씀
- 💡 알고 있었나요? (funFacts)
- 🤝 관계 카드: 의형제, 부모, 라이벌. 누르면 그 인물로 이동
- 🔊 읽어주기 버튼: Web Speech API로 TTS (비용 없음)

### 아이 맞춤 UX
- 큰 글씨, 넉넉한 터치 영역 (최소 48px)
- 폰트: 제목은 Jua, 본문은 Noto Sans KR ([DESIGN.md](./DESIGN.md) 3장)
- 태블릿 기준 2~3열 그리드
- "내 도감" 수집: 하트를 누르면 도장이 찍힘
  - 처음에는 계정 없이 localStorage에 저장하고, 필요해지면 DB로 옮김

### 콘텐츠 원칙
- 그리스신화와 삼국지에는 아이에게 부적절한 내용이 있으므로, 열전은 2학년 눈높이로 순화해서 작성합니다.

---

## 8. 디렉터리 구조

```
app/
  (public)/
    page.tsx                      # 세계관 선택
    [series]/page.tsx             # 도감 목록 (검색/필터/무한 스크롤)
    [series]/[slug]/page.tsx      # 인물 상세
    my/page.tsx                   # 내 도감
  admin/
    characters/                   # list, new, [id]/edit
    series/  factions/  tags/  import/
  actions/                        # 'use server' 액션
components/
  card/                           # CharacterCard, StatBar, RarityFrame, FlipCard
  filters/                        # SearchInput, FactionChips, SortSelect
lib/
  prisma.ts
  queries/
  schemas/                        # zod 스키마
  search/                         # choseong.ts
  auth.ts
prisma/
  schema.prisma
  migrations/
  seed/                           # three-kingdoms.json, greek.json …
proxy.ts
prisma.config.ts
docs/
  PLAN.md
```

---

## 9. 단계별 로드맵

| 단계 | 내용 | 결과물 |
|---|---|---|
| **0. 세팅** | Next 16 + Prisma 7 + Postgres + Tailwind/shadcn + TanStack Query + nuqs | 빈 앱이 빌드·배포됨 |
| **1. 데이터와 시드** | 스키마, 마이그레이션(pg_trgm 포함), 삼국지 20명·그리스신화 20명 시드 JSON | DB에 샘플 데이터가 들어감 |
| **2. 도감 목록** | 카드 컴포넌트, 서버 검색·필터, 커서 페이지네이션, SSR 하이드레이션 + 무한 스크롤 | **핵심 MVP** |
| **3. 인물 상세** | 능력치 시각화, 열전, 관계, TTS | 아이와 함께 써볼 수 있는 상태 |
| **4. 관리자** | 인증, 인물 CRUD, 이미지 업로드, 실시간 카드 미리보기 | 직접 인물을 추가할 수 있음 |
| **5. 확장** | 일괄 등록, 수호지·초한지 추가, 진영 엠블럼, 내 도감 | 콘텐츠 확장 |
| **6. 재미 요소 (선택)** | 능력치 대결(두 카드 비교), 퀴즈("이 무기의 주인은?"), 관계도 그래프, 오늘의 인물 | 다시 찾아오게 만드는 요소 |

---

## 10. 아직 정하지 않은 것

- [ ] **DB 호스팅:** Neon / Supabase / 로컬 Docker 중 선택
- [ ] **배포:** 무난한 조합은 Vercel + Neon(또는 Supabase) Postgres + Cloudflare R2
- [x] **디자인 방향:** Duolingo 스타일 B안으로 확정 → [DESIGN.md](./DESIGN.md)
- [ ] **일러스트 조달:** AI 생성 / 직접 그리기 / 무료 이미지
  - 카드 도감은 화풍 통일이 중요합니다. AI를 쓴다면 스타일 프롬프트를 고정해 둡니다.
  - 상업적으로 쓸 계획이 있다면 라이선스를 확인합니다.
- [ ] **열전 작성 방식:** 수십~수백 명 분량이므로, 관리자 화면의 "AI 초안 생성" 버튼 + 사람 검수 방식을 고려
- [ ] **능력치 기준표:** 삼국지는 코에이 수치를 참고하고, 신화 인물은 세계관마다 기준표를 만들어 일관성을 유지
- [ ] **인증 라이브러리:** Better Auth / Auth.js
