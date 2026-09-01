export { forTenant } from "@/lib/db/tenant";
export type { TenantPrismaClient } from "@/lib/db/tenant";
export { getTenantBySlug, getTenantSlugByHost, listTenants } from "@/lib/db/lookup";
export type { TenantSummary, TenantListItem } from "@/lib/db/lookup";
export { seedTenant, provisionTenant } from "@/lib/db/admin";
export { StaffRole, PlatformRole } from "@/generated/prisma/client";
