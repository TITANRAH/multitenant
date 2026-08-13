import { describe, expect, it, vi } from "vitest";

// $extends de Prisma real hace mucho más que esto, pero para testear la
// regla #8 de CLAUDE.md ("todo índice empieza por tenantId") solo nos
// interesa la config que forTenant() arma. Mockeamos $extends para que
// nos devuelva esa config tal cual, y así invocar $allOperations a mano.
vi.mock("@/lib/db/client", () => ({
  prisma: { $extends: (config: unknown) => config },
}));

const { forTenant } = await import("@/lib/db/tenant");

type Extension = {
  query: {
    $allModels: {
      $allOperations: (args: {
        model?: string;
        operation: string;
        args: unknown;
        query: (args: unknown) => unknown;
      }) => unknown;
    };
  };
};

const { $allOperations } = (forTenant("tccars-id") as unknown as Extension).query
  .$allModels;

describe("forTenant — inyección de tenantId", () => {
  it("agrega tenantId al where de findMany en un modelo scoped (TenantFeature)", async () => {
    const query = vi.fn().mockResolvedValue([]);

    await $allOperations({
      model: "TenantFeature",
      operation: "findMany",
      args: { where: { featureKey: "agenda" } },
      query,
    });

    expect(query).toHaveBeenCalledWith({
      where: { featureKey: "agenda", tenantId: "tccars-id" },
    });
  });

  it("agrega tenantId al data de create en un modelo scoped (User)", async () => {
    const query = vi.fn().mockResolvedValue({});

    await $allOperations({
      model: "User",
      operation: "create",
      args: { data: { email: "a@tccars.cl" } },
      query,
    });

    expect(query).toHaveBeenCalledWith({
      data: { email: "a@tccars.cl", tenantId: "tccars-id" },
    });
  });

  it("agrega tenantId a cada fila de createMany", async () => {
    const query = vi.fn().mockResolvedValue({ count: 2 });

    await $allOperations({
      model: "TenantFeature",
      operation: "createMany",
      args: { data: [{ featureKey: "agenda" }, { featureKey: "portal" }] },
      query,
    });

    expect(query).toHaveBeenCalledWith({
      data: [
        { featureKey: "agenda", tenantId: "tccars-id" },
        { featureKey: "portal", tenantId: "tccars-id" },
      ],
    });
  });

  it("no inyecta tenantId en un modelo que no lo tiene (Tenant)", async () => {
    const query = vi.fn().mockResolvedValue({});

    await $allOperations({
      model: "Tenant",
      operation: "findUnique",
      args: { where: { slug: "tccars" } },
      query,
    });

    expect(query).toHaveBeenCalledWith({ where: { slug: "tccars" } });
  });

  it("no toca args sin modelo (ej. operaciones crudas)", async () => {
    const query = vi.fn().mockResolvedValue(null);
    const args = { where: { slug: "tccars" } };

    await $allOperations({ operation: "findFirst", args, query });

    expect(query).toHaveBeenCalledWith(args);
  });

  it("fuerza tenantId también en el where de update/delete por id", async () => {
    const query = vi.fn().mockResolvedValue({});

    await $allOperations({
      model: "User",
      operation: "update",
      args: { where: { id: "otro-user-id" }, data: { nombre: "Nuevo" } },
      query,
    });

    // aunque el where original apunte a un id cualquiera, se exige además
    // que pertenezca a este tenant — así no sirve la clave de otro taller.
    expect(query).toHaveBeenCalledWith({
      where: { id: "otro-user-id", tenantId: "tccars-id" },
      data: { nombre: "Nuevo" },
    });
  });
});
