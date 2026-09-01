import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/db";
import { getInvitationByToken } from "@/lib/auth/invitations";
import { buttonVariants } from "@/components/ui/button";
import { AceptarInvitacionForm } from "@/app/[tenant]/invitacion/[token]/AceptarInvitacionForm";

// Fuera del componente a propósito: Date.now() es una función impura y
// react-hooks/purity no deja llamarla directo dentro del render.
function estaVencida(expiresAt: Date): boolean {
  return expiresAt.getTime() < Date.now();
}

export default async function InvitacionPage({
  params,
}: {
  params: Promise<{ tenant: string; token: string }>;
}) {
  const { tenant: slug, token } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  const invitation = await getInvitationByToken(tenant.id, token);

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Activar cuenta</h1>

      {!invitation ? (
        <p className="text-sm text-zinc-500">El link de invitación no es válido.</p>
      ) : invitation.acceptedAt ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-zinc-500">Esta invitación ya fue usada.</p>
          <Link href="/login" className={buttonVariants({ variant: "default" })}>
            Ir a iniciar sesión
          </Link>
        </div>
      ) : estaVencida(invitation.expiresAt) ? (
        <p className="text-sm text-zinc-500">
          Esta invitación venció. Pedile a un administrador del taller que te invite de nuevo.
        </p>
      ) : (
        <>
          <p className="text-sm text-zinc-500">
            Elegí una contraseña para <span className="font-medium">{invitation.email}</span>.
          </p>
          <AceptarInvitacionForm tenantId={tenant.id} token={token} />
        </>
      )}
    </main>
  );
}
