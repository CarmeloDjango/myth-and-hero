import type { Metadata, Viewport } from "next";
import { Jua, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const jua = Jua({
  variable: "--font-jua",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  weight: ["500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "영웅 도감",
  description: "신화와 역사 속 영웅들을 카드로 모으는 즐거운 도감",
  // 아이패드 "홈 화면에 추가" → 주소창 없이 앱처럼 (아이콘은 src/app/apple-icon.png, 설정은 src/app/manifest.ts)
  appleWebApp: { capable: true, title: "영웅 도감", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#58cc02",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${jua.variable} ${notoSansKr.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
