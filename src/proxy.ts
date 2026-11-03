import { auth } from "@/lib/auth/server";

/**
 * 가족 전용 서비스라 모든 화면이 로그인을 요구합니다.
 * 로그인·가입 화면(/auth/sign-in, /auth/sign-up …)과 /api/auth는 Neon Auth 기본값으로 열려 있습니다.
 *
 * 이 검사는 화면 이동용 1차 확인입니다. 데이터를 읽거나 바꾸는 서버 코드에서는
 * src/lib/family/viewer.ts로 세션과 가족을 다시 확인합니다.
 */
export default auth.middleware({
  loginUrl: "/auth/sign-in",
  publicRoutes: ["/api/health"],
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webmanifest)$).*)"],
};
