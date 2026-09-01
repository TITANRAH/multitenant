import { notFound } from "next/navigation";
import type { PlatformRole } from "@/lib/db";

// Eje de autorización separado de StaffRole/assertRole: un usuario puede
// ser OWNER de su taller y no tener ningún platformRole (el caso normal),
// o tener platformRole "SUPERADMIN" y así poder entrar al panel de
// plataforma (tenant especial "plataforma") sin importar su rol de staff.
export function isSuperAdmin(platformRole: PlatformRole | null): boolean {
  return platformRole === "SUPERADMIN";
}

export class NotPlatformAdminError extends Error {
  constructor() {
    super("Esta cuenta no tiene acceso al panel de plataforma.");
    this.name = "NotPlatformAdminError";
  }
}

/** Gate de servidor: para server actions del panel de plataforma. */
export function assertPlatformRole(platformRole: PlatformRole | null): void {
  if (!isSuperAdmin(platformRole)) {
    throw new NotPlatformAdminError();
  }
}

/** Gate de ruta: para layout/page del panel de plataforma. */
export function assertPlatformRoleOrNotFound(platformRole: PlatformRole | null): void {
  if (!isSuperAdmin(platformRole)) {
    notFound();
  }
}
