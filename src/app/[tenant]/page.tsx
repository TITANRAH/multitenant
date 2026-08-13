import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/db";

export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8">
      <h1 className="text-2xl font-semibold">{tenant.nombre}</h1>
      <p className="text-sm text-zinc-500">tenantId: {tenant.id}</p>
    </main>
  );
}
