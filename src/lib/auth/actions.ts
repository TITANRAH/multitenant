"use server";

import { signOut } from "@/lib/auth/auth";

/**
 * Sin assertRole/assertFeature (regla #3 del CLAUDE.md): cerrar tu propia
 * sesión no lee ni escribe nada del tenant, cualquier sesión válida puede
 * hacerlo sobre sí misma.
 */
export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
