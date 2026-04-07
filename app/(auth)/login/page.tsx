import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/shared/login-form";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
