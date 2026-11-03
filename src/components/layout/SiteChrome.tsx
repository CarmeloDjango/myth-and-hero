import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b-2 border-line px-6">
      <nav
        aria-label="주 메뉴"
        className="mx-auto flex min-h-[76px] max-w-[1200px] flex-wrap items-center justify-between gap-3"
      >
        <Link href="/" className="font-display text-[34px] text-green-dark">
          영웅 도감
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="sticker pressable inline-flex min-h-12 items-center rounded-button px-4 text-[15px] font-bold tracking-[0.053em] text-muted hover:bg-paper-dim"
          >
            세계관
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-green px-6 py-10">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4">
        <span className="font-display text-[28px] text-paper">영웅 도감</span>
        <span className="text-[15px] font-bold text-night">우리 아이 첫 인물 사전</span>
      </div>
    </footer>
  );
}
