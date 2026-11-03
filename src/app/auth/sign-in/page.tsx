import type { Metadata } from "next";

import { CenteredPanel } from "@/components/ui/form";

import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "로그인 · 영웅 도감" };

export default function SignInPage() {
  return (
    <CenteredPanel title="영웅 도감" lead="부모님 계정으로 로그인해 주세요.">
      <AuthForm mode="sign-in" />
    </CenteredPanel>
  );
}
