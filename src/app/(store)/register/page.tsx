import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/store/auth-shell";
import { RegisterForm } from "@/components/store/auth-forms";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create account"
      subtitle="Join QAHAF for faster checkout and order tracking."
      footer={<>Already have an account? <Link href="/login" className="text-espresso underline underline-offset-4">Sign in</Link></>}
    >
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
