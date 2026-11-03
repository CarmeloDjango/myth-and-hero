import type { ComponentProps, ReactNode } from "react";

/** 라벨이 붙은 입력칸 (docs/DESIGN.md 5장 검색창 스타일) */
export function TextField({
  label,
  hint,
  id,
  ...input
}: { label: string; hint?: string; id: string } & ComponentProps<"input">) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-bold">
        {label}
      </label>
      <input
        id={id}
        {...input}
        className="min-h-[54px] rounded-card border-2 border-line bg-paper-dim px-4 text-lg font-medium outline-none placeholder:text-muted focus:border-blue"
      />
      {hint ? <p className="text-sm font-medium text-muted">{hint}</p> : null}
    </div>
  );
}

export function PrimaryButton({ children, ...props }: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className="pressable inline-flex min-h-14 items-center justify-center rounded-button border-b-4 border-green-dark bg-green px-6 text-[17px] font-bold tracking-[0.053em] text-paper hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, ...props }: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className="sticker pressable inline-flex min-h-14 items-center justify-center rounded-button bg-paper px-6 text-[17px] font-bold tracking-[0.053em] text-blue-ink hover:bg-paper-dim disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-button bg-[#ffe2e2] px-4 py-3 text-[15px] font-bold text-[#b42318]">
      {children}
    </p>
  );
}

/** 가운데 정렬된 카드 한 장짜리 화면 (로그인, 가족 설정, 부모 PIN) */
export function CenteredPanel({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 items-start justify-center px-6 py-16">
      <div className="flex w-full max-w-[480px] flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="font-display text-5xl leading-[1.2] tracking-[-0.02em] text-green-dark">{title}</h1>
          {lead ? <p className="text-lg font-medium text-muted">{lead}</p> : null}
        </div>
        <div className="sticker flex flex-col gap-5 rounded-card p-6">{children}</div>
      </div>
    </main>
  );
}
