"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { assertPlatformRole } from "@/lib/auth/assertPlatformRole";
import { provisionTenant } from "@/lib/db";
import { crearTallerSchema, type CrearTallerInput } from "@/app/[tenant]/talleres/schema";

export type CrearTallerState = { error: string } | null;

/**
 * Server action del formulario de alta. El gate de servidor (regla #3 de
 * CLAUDE.md) es assertPlatformRole: sin sesión SUPERADMIN, ni siquiera
 * llega a leer el formulario. react-hook-form ya validó con
 * crearTallerSchema en el cliente, pero se vuelve a validar acá porque el
 * cliente nunca es confiable.
 */
export async function crearTallerAction(input: CrearTallerInput): Promise<CrearTallerState> {
  const session = await auth();
  assertPlatformRole(session?.user.platformRole ?? null);

  const parsed = crearTallerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { slug, host, nombre, paquete, adminEmail, adminName, correlativoInicial } = parsed.data;

  await provisionTenant({
    slug,
    host,
    nombre,
    paquete,
    admin: { email: adminEmail, name: adminName },
    invitedById: session!.user.id,
    correlativoInicial,
  });

  revalidatePath("/talleres");
  redirect("/talleres");
}
