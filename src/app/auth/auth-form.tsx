"use client";

import { useState } from "react";
import Link from "next/link";

import { FormError, PrimaryButton, TextField } from "@/components/ui/form";
import { authClient } from "@/lib/auth/client";

type Mode = "sign-in" | "sign-up";

/** Better Auth 오류 코드 → 부모님이 읽을 안내 문장 */
function toMessage(error: { code?: string; message?: string; status?: number } | null | undefined): string {
  switch (error?.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD":
    case "USER_NOT_FOUND":
      return "이메일이나 비밀번호가 맞지 않아요.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "이미 가입한 이메일이에요. 로그인해 주세요.";
    case "PASSWORD_TOO_SHORT":
      return "비밀번호는 8자 이상으로 정해 주세요.";
    case "INVALID_EMAIL":
      return "이메일 주소를 확인해 주세요.";
    case "EMAIL_NOT_VERIFIED":
      return "이메일 인증을 먼저 마쳐 주세요.";
    default:
      // 코드가 바뀌거나 없어도, 401은 "아이디·비밀번호가 맞지 않음"입니다.
      if (error?.status === 401) return "이메일이나 비밀번호가 맞지 않아요.";
      if (error?.status === 422 || error?.status === 400) return "입력한 내용을 다시 확인해 주세요.";
      if (error?.status === 429) return "잠시 뒤에 다시 시도해 주세요.";
      return "로그인 서버에 연결하지 못했어요. 잠시 뒤에 다시 시도해 주세요.";
  }
}

/** 던져진 오류에서 상태 코드와 오류 코드를 꺼냅니다 (네트워크 오류면 null). */
function readAuthError(thrown: unknown): { code?: string; status?: number } | null {
  if (!thrown || typeof thrown !== "object") return null;
  const e = thrown as { code?: unknown; status?: unknown; error?: { code?: unknown; status?: unknown } };
  const code = typeof e.code === "string" ? e.code : typeof e.error?.code === "string" ? e.error.code : undefined;
  const status = typeof e.status === "number" ? e.status : typeof e.error?.status === "number" ? e.error.status : undefined;
  return code || status ? { code, status } : null;
}

export function AuthForm({ mode }: { mode: Mode }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setPending(true);
    setError(undefined);
    try {
      const result =
        mode === "sign-in"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name: String(form.get("name") ?? "").trim() || "부모님" });
      if (result.error) {
        setError(toMessage(result.error));
        return;
      }
      // 로그인한 사람이 바뀌었으니 새 세션으로 전체를 새로 엽니다 (미리 받아 둔 화면을 쓰지 않도록).
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- 위 이유로 의도적
      window.location.assign("/");
    } catch (thrown) {
      // Neon Auth 클라이언트는 401 같은 응답을 { error }로 돌려주지 않고 예외로 던지기도 합니다.
      setError(toMessage(readAuthError(thrown)));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {mode === "sign-up" ? (
        <TextField id="name" name="name" label="부모님 이름" autoComplete="name" placeholder="예: 엄마, 아빠" />
      ) : null}
      <TextField id="email" name="email" type="email" label="이메일" autoComplete="email" required inputMode="email" />
      <TextField
        id="password"
        name="password"
        type="password"
        label="비밀번호"
        autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
        required
        minLength={8}
        hint={mode === "sign-up" ? "8자 이상" : undefined}
      />
      <FormError>{error}</FormError>
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "잠시만요…" : mode === "sign-in" ? "로그인" : "가입하기"}
      </PrimaryButton>
      <p className="text-center text-[15px] font-medium text-muted">
        {mode === "sign-in" ? (
          <>
            처음이세요?{" "}
            <Link href="/auth/sign-up" className="font-bold text-blue-ink underline-offset-4 hover:underline">
              가입하기
            </Link>
          </>
        ) : (
          <>
            이미 가입하셨나요?{" "}
            <Link href="/auth/sign-in" className="font-bold text-blue-ink underline-offset-4 hover:underline">
              로그인
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
