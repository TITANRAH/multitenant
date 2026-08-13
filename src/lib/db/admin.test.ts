import { beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.fn();
const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
const createMany = vi.fn().mockResolvedValue({ count: 0 });

const tx = {
  tenant: { upsert },
  tenantFeature: { deleteMany, createMany },
};

vi.mock("@/lib/db/client", () => ({
  prisma: {
    // seedTenant corre todo dentro de una transacción: simulamos que
    // Prisma ejecuta el callback pasándole nuestro `tx` de prueba.
    $transaction: (callback: (tx: unknown) => unknown) => callback(tx),
  },
}));

const { seedTenant } = await import("@/lib/db/admin");

beforeEach(() => {
  upsert.mockReset();
  deleteMany.mockClear();
  createMany.mockClear();
});

describe("seedTenant", () => {
  it("crea/actualiza el Tenant por slug (upsert, idempotente)", async () => {
    upsert.mockResolvedValue({ id: "tccars-id", slug: "tccars", nombre: "TCcars" });

    await seedTenant({
      slug: "tccars",
      host: "tccars.localhost:3000",
      nombre: "TCcars",
      features: ["ordenes", "agenda"],
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { slug: "tccars" },
      update: { host: "tccars.localhost:3000", nombre: "TCcars" },
      create: { slug: "tccars", host: "tccars.localhost:3000", nombre: "TCcars" },
    });
  });

  it("reemplaza las features del taller: borra todas y crea solo las pedidas", async () => {
    upsert.mockResolvedValue({ id: "tccars-id", slug: "tccars", nombre: "TCcars" });

    await seedTenant({
      slug: "tccars",
      host: "tccars.localhost:3000",
      nombre: "TCcars",
      features: ["ordenes", "agenda", "portal"],
    });

    expect(deleteMany).toHaveBeenCalledWith({ where: { tenantId: "tccars-id" } });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { tenantId: "tccars-id", featureKey: "ordenes" },
        { tenantId: "tccars-id", featureKey: "agenda" },
        { tenantId: "tccars-id", featureKey: "portal" },
      ],
    });
  });

  it("borra las features antes de crear las nuevas (orden importa)", async () => {
    upsert.mockResolvedValue({ id: "demo-id", slug: "demo", nombre: "Demo" });
    const order: string[] = [];
    deleteMany.mockImplementationOnce(async () => {
      order.push("delete");
      return { count: 0 };
    });
    createMany.mockImplementationOnce(async () => {
      order.push("create");
      return { count: 1 };
    });

    await seedTenant({
      slug: "demo",
      host: "demo.localhost:3000",
      nombre: "Demo",
      features: ["ordenes"],
    });

    expect(order).toEqual(["delete", "create"]);
  });

  it("devuelve el Tenant creado/actualizado", async () => {
    const tenant = { id: "demo-id", slug: "demo", nombre: "Taller Demo" };
    upsert.mockResolvedValue(tenant);

    await expect(
      seedTenant({
        slug: "demo",
        host: "demo.localhost:3000",
        nombre: "Taller Demo",
        features: [],
      }),
    ).resolves.toEqual(tenant);
  });
});
