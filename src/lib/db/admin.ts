import { prisma } from "@/lib/db/client";
import type { FeatureKey } from "@/features/registry";

type SeedTenantInput = {
  slug: string;
  host: string;
  nombre: string;
  features: readonly FeatureKey[];
};

/**
 * Alta mínima de un taller para poblar datos semilla/desarrollo. El alta
 * real (paquete, branding, admin, invitación) llega en el Sprint 2; esto
 * solo crea el Tenant y sus TenantFeature de forma idempotente.
 */
export async function seedTenant({
  slug,
  host,
  nombre,
  features,
}: SeedTenantInput) {
  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.upsert({
      where: { slug },
      update: { host, nombre },
      create: { slug, host, nombre },
    });

    await tx.tenantFeature.deleteMany({ where: { tenantId: tenant.id } });
    await tx.tenantFeature.createMany({
      data: features.map((featureKey) => ({
        tenantId: tenant.id,
        featureKey,
      })),
    });

    return tenant;
  });
}
