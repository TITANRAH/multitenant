import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { assertPlatformRoleOrNotFound } from "@/lib/auth/assertPlatformRole";
import { listTenants } from "@/lib/db";
import { LogoutButton } from "@/components/LogoutButton";
import { buttonVariants } from "@/components/ui/button";

// Panel de plataforma: vive bajo el tenant especial "plataforma"
// (plataforma.localhost/talleres), pero por estar dentro de la carpeta
// dinámica [tenant] esta ruta también "existe" para cualquier otro
// subdominio. El gate real es este: sin sesión SUPERADMIN, 404 para
// cualquiera que no sea la plataforma (docs/plan.md sección 3).
export default async function TalleresPage() {
  const session = await auth();
  assertPlatformRoleOrNotFound(session?.user.platformRole ?? null);

  const tenants = await listTenants();

  return (
    <main className="mx-auto flex w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Talleres</h1>
        <div className="flex items-center gap-3">
          <Link href="/talleres/nuevo" className={buttonVariants({ variant: "default" })}>
            Nuevo taller
          </Link>
          <LogoutButton />
        </div>
      </div>

      {tenants.length === 0 ? (
        <p className="text-sm text-zinc-500">Todavía no hay talleres dados de alta.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {tenants.map((tenant) => (
            <li key={tenant.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{tenant.nombre}</p>
                <p className="text-sm text-zinc-500">{tenant.host}</p>
              </div>
              <span className="text-xs text-zinc-400">
                {tenant.createdAt.toLocaleDateString("es-CL")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
