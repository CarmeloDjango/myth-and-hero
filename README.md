# myth-and-hero · 영웅 도감

초등학교 2학년 아이를 위한 신화·역사 인물 도감 웹서비스입니다.

- 계획: [docs/PLAN.md](docs/PLAN.md)
- 디자인: [docs/DESIGN.md](docs/DESIGN.md)

## 기술 스택

- Next.js 16 (App Router, Cache Components)
- Prisma 7 + `@prisma/adapter-pg` (node-postgres)
- Neon Postgres + Neon Auth (Managed Better Auth) + Neon Object Storage — `neon.ts`로 서비스 선언
- Tailwind CSS v4

## 처음 세팅하기

```bash
npm install
npm i -g neon@latest
neon login
neon deploy          # neon.ts 적용 + .env.local에 DB, Auth, 저장소(AWS_*) 환경 변수 생성
echo "NEON_AUTH_COOKIE_SECRET=$(openssl rand -base64 32)" >> .env.local   # 세션 쿠키 키 (처음 한 번)
npm run db:migrate   # prisma/migrations 적용 (직접 연결 URL 사용)
npm run db:seed      # 공식 데이터 (그리스신화 14명, 삼국지 20명, 수호지 15명, 초한지 14명)
npm run dev
```

처음 접속하면 로그인 화면이 나옵니다. 부모님 계정으로 가입 → 아이 프로필과 부모 PIN 설정 → 아이 아바타를 고르면 도감이 열립니다.

연결이 잘 되는지 확인하려면 개발 서버를 띄운 뒤 http://localhost:3000/api/health/db 를 열어 보세요. `ok: true`와 인물 수가 보이면 성공입니다.

## DB 연결 방식

| 용도 | 환경 변수 | 연결 |
|---|---|---|
| 앱 런타임 (`src/lib/db.ts`) | `DATABASE_URL` | 풀링(`-pooler`) 연결 + pg Pool. Vercel에서는 `attachDatabasePool`로 유휴 연결을 정리 |
| 마이그레이션, 시드 (`prisma.config.ts`, `prisma/seed.ts`) | `DATABASE_URL_UNPOOLED` | 직접 연결 (PgBouncer를 거치지 않음) |

### Postgres 포트(5432)를 쓸 수 없는 환경

일부 샌드박스처럼 HTTPS만 나갈 수 있는 곳에서는 `DATABASE_DRIVER=neon-http`를 주면 Neon serverless 드라이버의 HTTP 모드로 접속합니다.

```bash
DATABASE_DRIVER=neon-http npm run start
```

이 모드는 **트랜잭션을 지원하지 않습니다**(upsert, `$transaction`, 중첩 쓰기 불가). 화면 확인이나 읽기 위주 점검용으로만 쓰고, 배포 환경에서는 기본값(pg)을 씁니다.

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | Prisma Client 생성 후 프로덕션 빌드 |
| `npm run db:migrate` | 마이그레이션 적용 (`prisma migrate deploy`) |
| `npm run db:migrate:dev` | 스키마 변경 후 새 마이그레이션 만들기 |
| `npm run db:seed` | 시드 데이터 넣기 |
| `npm run db:studio` | Prisma Studio |

## 로그인과 가족

| 화면 | 설명 |
|---|---|
| `/auth/sign-in`, `/auth/sign-up` | 부모님 계정 (Neon Auth 이메일·비밀번호) |
| `/setup` | 처음 한 번: 아이 프로필(1~4명)과 부모 PIN |
| `/me` | 누가 볼지 고르기 (아바타를 누르면 바로 입장) |
| `/parent` | 부모 모드 (PIN 확인 후 10분): 프로필 관리, 로그아웃 |

- 모든 화면은 로그인이 필요합니다 (`src/proxy.ts`). 예외: 로그인·가입 화면, `/api/auth`, `/api/health`.
- 서버 액션과 데이터 조회는 `src/lib/family/viewer.ts`로 세션과 가족을 다시 확인합니다.
- 가족 데이터 공개 범위는 `src/lib/queries/visibility.ts` 한 곳에서 정합니다 (공식 데이터 + 우리 가족 데이터).

## 로컬 Postgres로 테스트하기

Neon 대신 로컬 Postgres에 마이그레이션과 시드를 적용해 기본(pg) 드라이버로 확인할 수 있습니다. 로그인은 여전히 Neon Auth를 씁니다.

```bash
DATABASE_URL=postgresql://postgres@127.0.0.1:5432/hero DATABASE_URL_UNPOOLED=postgresql://postgres@127.0.0.1:5432/hero npm run db:migrate
```

## 환경 변수 (Vercel에도 같은 이름으로)

| 이름 | 어디서 |
|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | Neon 콘솔 → Connect (풀링 켬 / 끔) |
| `NEON_AUTH_BASE_URL` | Neon 콘솔 → Auth |
| `NEON_AUTH_COOKIE_SECRET` | 직접 만든 32자 이상 무작위 문자열 |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION` | 아이 그림 저장소(`drawings` 버킷). `neon deploy`/`neon env pull` 후 `.env.local`에서 복사 |

## 테스트

```bash
# 테스트 전용 DB (마이그레이션 + 시드 적용된 로컬 Postgres 등). 운영 Neon DB는 거부합니다.
TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/hero_test npm run test:db
```

`tests/heroes.service.test.mts`: 영웅 만들기의 소유권, 능력치 250점 규칙, 가족 공개 범위, 그림 버전 관리, 부모 모드 숨기기·지우기를 확인합니다 (그림 저장소는 메모리로 대체).
