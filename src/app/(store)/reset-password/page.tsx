import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/store/auth-shell";
import { ResetPasswordForm } from "@/components/store/auth-forms";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
