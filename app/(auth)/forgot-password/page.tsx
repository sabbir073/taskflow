import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/shared/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
