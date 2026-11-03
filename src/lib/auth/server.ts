import "server-only";

import { createNeonAuth } from "@neon/auth/next/server";

/**
 * Neon Auth (Managed Better Auth) 서버 인스턴스
 * - NEON_AUTH_BASE_URL: `neon deploy` / `neon env pull`이 .env.local에 넣어 줍니다.
 * - NEON_AUTH_COOKIE_SECRET: 앱이 정하는 32자 이상 비밀값 (`openssl rand -base64 32`).
 */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});
