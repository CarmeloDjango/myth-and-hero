const CHOSEONG = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

/** "제갈량" → "ㅈㄱㄹ". 한글 음절이 아닌 글자는 그대로 둡니다. */
export function toChoseong(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= HANGUL_START && code <= HANGUL_END) {
      out += CHOSEONG[Math.floor((code - HANGUL_START) / 588)];
    } else {
      out += ch;
    }
  }
  return out;
}

/** 입력이 모두 한글 자음(초성)인지 확인합니다. 공백은 무시합니다. */
export function isChoseongOnly(text: string): boolean {
  const compact = text.replace(/\s+/g, "");
  return compact.length > 0 && /^[ㄱ-ㅎ]+$/.test(compact);
}

/** 검색용 텍스트: 이름 + 별칭 + 칭호를 공백으로 이어 붙입니다. */
export function buildSearchText(parts: {
  name: string;
  aliases?: string[];
  title?: string | null;
}): string {
  return [parts.name, ...(parts.aliases ?? []), parts.title ?? ""]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
}
