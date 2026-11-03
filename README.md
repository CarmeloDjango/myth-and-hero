# myth-and-hero · 영웅 도감

초등학교 2학년 아이를 위한 신화·역사 인물 도감 웹서비스입니다.

- 계획: [docs/PLAN.md](docs/PLAN.md)
- 디자인: [docs/DESIGN.md](docs/DESIGN.md)

## 기술 스택

- Next.js 16 (App Router, Cache Components)
- Prisma 7 + `@prisma/adapter-pg` (node-postgres)
- Neon Postgres (`neon.ts`로 서비스 선언)
- Tailwind CSS v4

## 처음 세팅하기

```bash
npm install
npm i -g neon@latest
neon login
neon deploy          # neon.ts 적용 + .env.local에 DATABASE_URL / DATABASE_URL_UNPOOLED 생성
npm run db:migrate   # prisma/migrations 적용 (직접 연결 URL 사용)
npm run db:seed      # 예시 데이터 (삼국지 3명)
npm run dev
```

연결이 잘 되는지 확인하려면 개발 서버를 띄운 뒤 http://localhost:3000/api/health/db 를 열어 보세요. `ok: true`와 인물 수가 보이면 성공입니다.

## DB 연결 방식

| 용도 | 환경 변수 | 연결 |
|---|---|---|
| 앱 런타임 (`src/lib/db.ts`) | `DATABASE_URL` | 풀링(`-pooler`) 연결 + pg Pool. Vercel에서는 `attachDatabasePool`로 유휴 연결을 정리 |
| 마이그레이션, 시드 (`prisma.config.ts`, `prisma/seed.ts`) | `DATABASE_URL_UNPOOLED` | 직접 연결 (PgBouncer를 거치지 않음) |

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | Prisma Client 생성 후 프로덕션 빌드 |
| `npm run db:migrate` | 마이그레이션 적용 (`prisma migrate deploy`) |
| `npm run db:migrate:dev` | 스키마 변경 후 새 마이그레이션 만들기 |
| `npm run db:seed` | 시드 데이터 넣기 |
| `npm run db:studio` | Prisma Studio |
