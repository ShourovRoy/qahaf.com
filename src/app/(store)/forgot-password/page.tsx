import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/store/auth-shell";
import { ForgotPasswordForm } from "@/components/store/auth-forms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={<Link href="/login" className="underline underline-offset-4">Back to sign in</Link>}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
