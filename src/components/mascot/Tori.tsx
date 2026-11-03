/** 안내 캐릭터 "꼬마 장군 토리" (임시 그림, docs/HERO_MAKER.md 6장 원칙) */
export function Tori({ size = 96, mood = "happy" }: { size?: number; mood?: "happy" | "wow" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" width={size} height={size} className="shrink-0">
      <ellipse cx="100" cy="186" rx="58" ry="8" fill="#e5e5e5" />
      <ellipse cx="72" cy="178" rx="18" ry="10" fill="#ff9600" stroke="#4b4b4b" strokeWidth="4" />
      <ellipse cx="128" cy="178" rx="18" ry="10" fill="#ff9600" stroke="#4b4b4b" strokeWidth="4" />
      <ellipse cx="100" cy="122" rx="68" ry="60" fill="#ff9600" stroke="#4b4b4b" strokeWidth="5" />
      <ellipse cx="100" cy="146" rx="40" ry="30" fill="#ffd9a0" />
      <path d="M34 104 A66 62 0 0 1 166 104 L166 112 L34 112 Z" fill="#ce82ff" stroke="#4b4b4b" strokeWidth="5" strokeLinejoin="round" />
      <circle cx="100" cy="74" r="9" fill="#ffc800" stroke="#4b4b4b" strokeWidth="4" />
      <path d="M100 66 C 96 36, 124 22, 148 28 C 132 38, 122 48, 110 66 Z" fill="#ff4b4b" stroke="#4b4b4b" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="78" cy="132" r="15" fill="#ffffff" stroke="#4b4b4b" strokeWidth="4" />
      <circle cx="122" cy="132" r="15" fill="#ffffff" stroke="#4b4b4b" strokeWidth="4" />
      <circle cx="81" cy="134" r="7" fill="#4b4b4b" />
      <circle cx="119" cy="134" r="7" fill="#4b4b4b" />
      <ellipse cx="60" cy="152" rx="9" ry="5" fill="#ff86d0" />
      <ellipse cx="140" cy="152" rx="9" ry="5" fill="#ff86d0" />
      {mood === "wow" ? (
        <ellipse cx="100" cy="162" rx="9" ry="8" fill="#4b4b4b" />
      ) : (
        <path d="M90 156 Q 100 166 110 156" fill="none" stroke="#4b4b4b" strokeWidth="4" strokeLinecap="round" />
      )}
    </svg>
  );
}
