import { prisma } from "@/lib/db/client";
import type { FeatureKey } from "@/features/registry";
import { PACKAGES, type PackageKey } from "@/features/packages";
import { createInvitation } from "@/lib/auth/invitations";

type SeedTenantInput = {
  slug: string;
  host: string;
  nombre: string;
  features: readonly FeatureKey[];
  // Número desde donde sigue la numeración de OT/mantenciones (docs/plan.md
  // sección Sprint 2). Un taller con historial previo llega con esto > 1;
  // uno nuevo lo deja en 1. Solo se usa al crear — un re-seed no lo toca,
  // para no pisar el contador ya en marcha (regla #5: nunca resetear algo
  // que ya avanzó).
  correlativoInicial?: number;
};

/**
 * Alta/actualización idempotente del Tenant: crea (o upsertea) el Tenant,
 * su TenantConfig con branding vacío (Sprint 10 lo llena; el PDF del
 * Sprint 4 ya necesita la fila) y reemplaza sus TenantFeature por las
 * pedidas. No crea admin ni manda invitación — eso lo hace provisionTenant.
 */
export async function seedTenant({
  slug,
  host,
  nombre,
  features,
  correlativoInicial = 1,
}: SeedTenantInput) {
  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.upsert({
      where: { slug },
      update: { host, nombre },
      create: { slug, host, nombre },
    });

    await tx.tenantConfig.upsert({
      where: { tenantId: tenant.id },
      update: {},
      create: { tenantId: tenant.id, correlativoActual: correlativoInicial },
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

type ProvisionTenantInput = {
  slug: string;
  host: string;
  nombre: string;
  paquete: PackageKey;
  admin: { email: string; name: string };
  invitedById: string; // User.id de quien da de alta (el SUPERADMIN de la plataforma)
  correlativoInicial?: number;
};

/**
 * Alta completa de un taller nuevo desde el panel de plataforma (Sprint 2,
 * ver docs/plan.md sección 3, pasos 1-4). El paso 5 (datos base: categorías
 * de gastos, servicios frecuentes, estados de OT) llega con los módulos
 * que los usan, todavía no existen.
 */
export async function provisionTenant({
  slug,
  host,
  nombre,
  paquete,
  admin,
  invitedById,
  correlativoInicial,
}: ProvisionTenantInput) {
  const tenant = await seedTenant({
    slug,
    host,
    nombre,
    features: PACKAGES[paquete].features,
    correlativoInicial,
  });

  const { invitation } = await createInvitation({
    tenantId: tenant.id,
    tenantHost: host,
    invitedById,
    email: admin.email,
    name: admin.name,
    role: "OWNER",
  });

  return { tenant, invitation };
}
