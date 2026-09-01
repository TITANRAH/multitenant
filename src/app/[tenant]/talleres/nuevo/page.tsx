import { auth } from "@/lib/auth/auth";
import { assertPlatformRoleOrNotFound } from "@/lib/auth/assertPlatformRole";
import { NuevoTallerForm } from "@/app/[tenant]/talleres/nuevo/NuevoTallerForm";

export default async function NuevoTallerPage() {
  const session = await auth();
  assertPlatformRoleOrNotFound(session?.user.platformRole ?? null);

  return (
    <main className="mx-auto w-full flex max-w-lg flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Nuevo taller</h1>
      <NuevoTallerForm />
    </main>
  );
}
