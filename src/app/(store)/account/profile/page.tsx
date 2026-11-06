import type { Metadata } from "next";
import { Suspense } from "react";
import { ChangeEmailForm, ChangePasswordForm, ProfileForm } from "@/components/store/profile-forms";
import { PageHeading, Skeleton } from "@/components/ui/misc";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

export default function ProfilePage() {
  return (
    <>
      <PageHeading eyebrow="My account" title="Profile" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Forms />
      </Suspense>
    </>
  );
}

async function Forms() {
  const user = await requireUser("/account/profile");
  return (
    <div className="space-y-8">
      <Section title="Personal details">
        <ProfileForm name={user.name} phone={user.phone ?? ""} />
      </Section>
      <Section title="Email address">
        <ChangeEmailForm email={user.email} />
      </Section>
      <Section title="Password">
        <ChangePasswordForm />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-chocolate/15 p-6">
      <h2 className="eyebrow mb-5">{title}</h2>
      {children}
    </section>
  );
}
