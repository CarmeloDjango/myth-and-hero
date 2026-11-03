/** 마지막 글자에 받침이 있는지 (한글이 아니면 false) */
export function hasBatchim(word: string): boolean {
  const code = word.trim().charCodeAt(word.trim().length - 1);
  if (!(code >= 0xac00 && code <= 0xd7a3)) return false;
  return (code - 0xac00) % 28 !== 0;
}

/** 받침에 맞는 조사: josa("관우", "은", "는") → "관우는" */
export function josa(word: string, withBatchim: string, withoutBatchim: string): string {
  return `${word}${hasBatchim(word) ? withBatchim : withoutBatchim}`;
}
