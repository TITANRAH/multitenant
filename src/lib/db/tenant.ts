import { prisma } from "@/lib/db/client";

// Modelos que tienen columna tenantId. Se actualiza a mano cada vez que se
// agrega un modelo nuevo con esa columna (regla no negociable #8 de CLAUDE.md).
const TENANT_SCOPED_MODELS = new Set([
  "TenantConfig",
  "TenantFeature",
  "User",
]);

/**
 * Cliente Prisma acotado a un taller: inyecta tenantId en todo where/create
 * de los modelos con esa columna, para que ningún query pueda leer o escribir
 * datos de otro taller por accidente.
 */
export function forTenant(tenantId: string) {
  return prisma.$extends({
    name: `forTenant(${tenantId})`,
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const params = args as Record<string, unknown>;

          switch (operation) {
            case "findFirst":
            case "findFirstOrThrow":
            case "findMany":
            case "count":
            case "aggregate":
            case "groupBy":
            case "updateMany":
            case "deleteMany":
              params.where = { ...(params.where as object), tenantId };
              break;
            case "findUnique":
            case "findUniqueOrThrow":
            case "update":
            case "upsert":
            case "delete":
              // El where de estas operaciones va sobre @id/@unique; se exige
              // tenantId además de esa clave para que no sirva la de otro taller.
              params.where = { ...(params.where as object), tenantId };
              break;
            case "create":
              params.data = { ...(params.data as object), tenantId };
              break;
            case "createMany":
              params.data = (params.data as object[]).map((row) => ({
                ...row,
                tenantId,
              }));
              break;
          }

          return query(params as typeof args);
        },
      },
    },
  });
}

export type TenantPrismaClient = ReturnType<typeof forTenant>;
