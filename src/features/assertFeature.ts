import { notFound } from "next/navigation";
import { forTenant } from "@/lib/db";
import type { FeatureKey } from "@/features/registry";

export class FeatureNotEnabledError extends Error {
  constructor(
    public readonly tenantId: string,
    public readonly featureKey: FeatureKey,
  ) {
    super(`La feature "${featureKey}" no está activa para el taller ${tenantId}.`);
    this.name = "FeatureNotEnabledError";
  }
}

export async function hasFeature(
  tenantId: string,
  featureKey: FeatureKey,
): Promise<boolean> {
  const db = forTenant(tenantId);
  const row = await db.tenantFeature.findFirst({
    where: {
      featureKey,
      enabled: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  return row !== null;
}

/**
 * Gate de servidor: primera línea de toda server action de un módulo.
 * Lanza si la feature no está activa; esta es la barrera real (sección 2.2
 * de docs/plan.md), no un adorno de UI.
 */
export async function assertFeature(
  tenantId: string,
  featureKey: FeatureKey,
): Promise<void> {
  if (!(await hasFeature(tenantId, featureKey))) {
    throw new FeatureNotEnabledError(tenantId, featureKey);
  }
}

/**
 * Gate de ruta: usar en layout/page del módulo. Responde 404, igual que si
 * la ruta no existiera, tanto por navegación como por URL directa.
 */
export async function assertFeatureOrNotFound(
  tenantId: string,
  featureKey: FeatureKey,
): Promise<void> {
  if (!(await hasFeature(tenantId, featureKey))) {
    notFound();
  }
}
