import { worldColor } from "@/lib/worlds/rules";

/** 공식 세계관 기본 색 (themeColor → 연한 배경) */
const OFFICIAL_TINT: Record<string, string> = { "#58cc02": "#d7ffb8", "#ce82ff": "#f3e1ff" };

/** 세계관 카드 위쪽 그림 영역: 표지 그림이 있으면 그림, 없으면 이름 두 글자 */
export function WorldCover({ name, themeColor, coverSrc, className = "h-40" }: { name: string; themeColor: string | null; coverSrc: string | null; className?: string }) {
  const tint = worldColor(themeColor)?.soft ?? (themeColor && OFFICIAL_TINT[themeColor]) ?? "#f7f7f7";
  return (
    <span aria-hidden="true" className={`relative flex items-center justify-center overflow-hidden font-display text-7xl text-ink/20 ${className}`} style={{ background: tint }}>
      {coverSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- 가족 전용 비공개 그림
        <img src={coverSrc} alt="" className="absolute inset-0 h-full w-full object-contain" />
      ) : (
        name.slice(0, 2)
      )}
    </span>
  );
}
