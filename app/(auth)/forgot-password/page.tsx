import type { Metadata } from "next";
import { ForgotPasswordForm, InvalidResetTokenView } from "@/components/shared/forgot-password-form";
import { getResetTokenStatus } from "@/lib/actions/auth";

export const metadata: Metadata = {
  title: "Forgot Password",
};

// `searchParams` is async in Next 16. The token comes from the email link
// (`/forgot-password?token=...`). We validate it server-side BEFORE
// rendering the password form so:
//   - bad / expired tokens get a clear error screen instead of a form
//     that can never succeed,
//   - the form is only shown when we know the token will actually work,
//   - non-existent tokens never reveal whether they ever existed
//     (constant response shape — no enumeration).
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <ForgotPasswordForm />;
  }

  const status = await getResetTokenStatus(token);
  if (status !== "valid") {
    return <InvalidResetTokenView reason={status} />;
  }

  return <ForgotPasswordForm token={token} />;
}
