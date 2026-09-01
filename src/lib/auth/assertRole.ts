import { notFound } from "next/navigation";
import { StaffRole } from "@/lib/db";

// Jerarquía del staff de un taller (confirmada con el usuario, Sprint 2):
// MECANICO < RECEPCION < ADMIN < OWNER. Pedir un rol mínimo también deja
// pasar a cualquiera por encima en la escalera.
const ROLE_LEVEL: Record<StaffRole, number> = {
  MECANICO: 0,
  RECEPCION: 1,
  ADMIN: 2,
  OWNER: 3,
};

export function hasRole(actualRole: StaffRole, minimo: StaffRole): boolean {
  return ROLE_LEVEL[actualRole] >= ROLE_LEVEL[minimo];
}

export class InsufficientRoleError extends Error {
  constructor(
    public readonly actualRole: StaffRole,
    public readonly minimo: StaffRole,
  ) {
    super(`El rol "${actualRole}" no alcanza el mínimo requerido ("${minimo}").`);
    this.name = "InsufficientRoleError";
  }
}

/**
 * Gate de servidor: para server actions, junto a assertFeature.
 * Lanza si el rol del usuario no alcanza el mínimo pedido.
 */
export function assertRole(actualRole: StaffRole, minimo: StaffRole): void {
  if (!hasRole(actualRole, minimo)) {
    throw new InsufficientRoleError(actualRole, minimo);
  }
}

/**
 * Gate de ruta: para layout/page. Responde 404 en vez de lanzar,
 * igual que assertFeatureOrNotFound.
 */
export function assertRoleOrNotFound(actualRole: StaffRole, minimo: StaffRole): void {
  if (!hasRole(actualRole, minimo)) {
    notFound();
  }
}
