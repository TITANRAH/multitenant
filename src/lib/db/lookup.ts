import { cache } from "react";
import { prisma } from "@/lib/db/client";

export type TenantSummary = {
  id: string;
  slug: string;
  nombre: string;
};

/**
 * Resuelve el Tenant raíz a partir del slug de la URL (`/[tenant]/...`).
 * Es la única consulta del sistema que no pasa por forTenant: todavía no
 * hay un tenantId con el cual acotarla.
 *
 * Envuelta en `cache()` para que layout y page del mismo request no dupliquen
 * la consulta.
 */
export const getTenantBySlug = cache(
  async (slug: string): Promise<TenantSummary | null> => {
    return prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true, nombre: true },
    });
  },
);
