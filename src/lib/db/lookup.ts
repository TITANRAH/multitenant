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

/**
 * Resuelve el slug a partir del host (header Host de la petición). La usa
 * `proxy.ts` para decidir a qué carpeta /[tenant]/... reescribir.
 *
 * Sin cache() a propósito: proxy.ts corre por fuera del árbol de React
 * (es lo primero que toca cada request), así que el cache de React no
 * aplica ahí. Cachear esto de otra forma es optimización prematura hasta
 * que se mida que hace falta.
 */
export async function getTenantSlugByHost(host: string): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { host },
    select: { slug: true },
  });
  return tenant?.slug ?? null;
}

export type TenantListItem = {
  id: string;
  slug: string;
  host: string;
  nombre: string;
  createdAt: Date;
};

/**
 * Lista los talleres para el panel de plataforma. Excluye el tenant
 * especial "plataforma": es la plataforma misma, no un cliente.
 */
export async function listTenants(): Promise<TenantListItem[]> {
  return prisma.tenant.findMany({
    where: { slug: { not: "plataforma" } },
    select: { id: true, slug: true, host: true, nombre: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}
