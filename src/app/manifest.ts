import type { MetadataRoute } from "next";

/**
 * 홈 화면 앱 (PWA): 아이패드 Safari에서 "공유 → 홈 화면에 추가"를 하면
 * 주소창 없이 앱처럼 전체 화면으로 열립니다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "영웅 도감",
    short_name: "영웅 도감",
    description: "신화와 역사 속 영웅들을 카드로 모으는 즐거운 도감",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#58cc02",
    lang: "ko",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
