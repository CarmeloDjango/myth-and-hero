"use client";

import { createAuthClient } from "@neon/auth/next";

/** 브라우저용 인증 클라이언트. 같은 주소의 /api/auth 프록시로 요청합니다. */
export const authClient = createAuthClient();
