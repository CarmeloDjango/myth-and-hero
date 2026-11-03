import type { Metadata } from "next";

import { CenteredPanel } from "@/components/ui/form";

import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "가입하기 · 영웅 도감" };

export default function SignUpPage() {
  return (
    <CenteredPanel title="가족 도감 만들기" lead="부모님 계정을 만들면 아이 프로필을 추가할 수 있어요.">
      <AuthForm mode="sign-up" />
    </CenteredPanel>
  );
}
