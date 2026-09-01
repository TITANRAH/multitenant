import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/db";
import { LoginForm } from "@/app/[tenant]/login/LoginForm";

export default async function LoginPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  return (
    <main className="mx-auto w-full flex max-w-sm flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Ingresar</h1>
      <LoginForm tenantId={tenant.id} />
    </main>
  );
}
