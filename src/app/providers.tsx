"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";

let browserQueryClient: QueryClient | undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // 서버에서 하이드레이션한 데이터를 바로 다시 불러오지 않도록 잠시 신선한 것으로 봅니다.
      queries: { staleTime: 60_000, refetchOnWindowFocus: false },
    },
  });
}

function getQueryClient() {
  // 서버 요청끼리는 분리하고, 브라우저에서는 하나의 캐시를 계속 씁니다.
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <NuqsAdapter>
      <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>
    </NuqsAdapter>
  );
}
