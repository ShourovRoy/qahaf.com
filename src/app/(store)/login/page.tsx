import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/store/auth-shell";
import { LoginForm } from "@/components/store/auth-forms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to checkout, track orders and read reviews."
      footer={<>New to QAHAF? <Link href="/register" className="text-espresso underline underline-offset-4">Create an account</Link></>}
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
