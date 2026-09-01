import { beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.fn();
const configUpsert = vi.fn().mockResolvedValue({});
const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
const createMany = vi.fn().mockResolvedValue({ count: 0 });

const tx = {
  tenant: { upsert },
  tenantConfig: { upsert: configUpsert },
  tenantFeature: { deleteMany, createMany },
};

vi.mock("@/lib/db/client", () => ({
  prisma: {
    // seedTenant corre todo dentro de una transacción: simulamos que
    // Prisma ejecuta el callback pasándole nuestro `tx` de prueba.
    $transaction: (callback: (tx: unknown) => unknown) => callback(tx),
  },
}));

const createInvitation = vi.fn();
vi.mock("@/lib/auth/invitations", () => ({
  createInvitation: (input: unknown) => createInvitation(input),
}));

const { seedTenant, provisionTenant } = await import("@/lib/db/admin");

beforeEach(() => {
  upsert.mockReset();
  configUpsert.mockClear();
  deleteMany.mockClear();
  createMany.mockClear();
  createInvitation.mockReset();
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

  it("crea el TenantConfig del taller si no existe (branding vacío, correlativo en 1 por defecto)", async () => {
    upsert.mockResolvedValue({ id: "tccars-id", slug: "tccars", nombre: "TCcars" });

    await seedTenant({
      slug: "tccars",
      host: "tccars.localhost:3000",
      nombre: "TCcars",
      features: [],
    });

    expect(configUpsert).toHaveBeenCalledWith({
      where: { tenantId: "tccars-id" },
      update: {},
      create: { tenantId: "tccars-id", correlativoActual: 1 },
    });
  });

  it("siembra el correlativo desde donde el taller se quedó, si se pasa uno", async () => {
    upsert.mockResolvedValue({ id: "tccars-id", slug: "tccars", nombre: "TCcars" });

    await seedTenant({
      slug: "tccars",
      host: "tccars.localhost:3000",
      nombre: "TCcars",
      features: [],
      correlativoInicial: 1247,
    });

    expect(configUpsert).toHaveBeenCalledWith({
      where: { tenantId: "tccars-id" },
      update: {},
      create: { tenantId: "tccars-id", correlativoActual: 1247 },
    });
  });

  it("un re-seed no toca el correlativo ya en marcha (update: {})", async () => {
    upsert.mockResolvedValue({ id: "tccars-id", slug: "tccars", nombre: "TCcars" });

    await seedTenant({
      slug: "tccars",
      host: "tccars.localhost:3000",
      nombre: "TCcars",
      features: [],
      correlativoInicial: 999,
    });

    expect(configUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: {} }),
    );
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

describe("provisionTenant", () => {
  it("expande las features del paquete elegido al crear el Tenant", async () => {
    upsert.mockResolvedValue({ id: "nuevo-id", slug: "nuevo", nombre: "Taller Nuevo" });
    createInvitation.mockResolvedValue({ invitation: { id: "inv1", token: "tok" } });

    await provisionTenant({
      slug: "nuevo",
      host: "nuevo.localhost:3000",
      nombre: "Taller Nuevo",
      paquete: "basico",
      admin: { email: "owner@nuevo.cl", name: "Dueño" },
      invitedById: "superadmin-id",
    });

    expect(createMany).toHaveBeenCalledWith({
      data: [
        { tenantId: "nuevo-id", featureKey: "ordenes" },
        { tenantId: "nuevo-id", featureKey: "agenda" },
      ],
    });
  });

  it("invita al admin como OWNER del taller recién creado", async () => {
    upsert.mockResolvedValue({ id: "nuevo-id", slug: "nuevo", nombre: "Taller Nuevo" });
    createInvitation.mockResolvedValue({ invitation: { id: "inv1", token: "tok" } });

    await provisionTenant({
      slug: "nuevo",
      host: "nuevo.localhost:3000",
      nombre: "Taller Nuevo",
      paquete: "operativo",
      admin: { email: "owner@nuevo.cl", name: "Dueño" },
      invitedById: "superadmin-id",
    });

    expect(createInvitation).toHaveBeenCalledWith({
      tenantId: "nuevo-id",
      tenantHost: "nuevo.localhost:3000",
      invitedById: "superadmin-id",
      email: "owner@nuevo.cl",
      name: "Dueño",
      role: "OWNER",
    });
  });

  it("pasa el correlativo inicial hasta el TenantConfig del taller nuevo", async () => {
    upsert.mockResolvedValue({ id: "nuevo-id", slug: "nuevo", nombre: "Taller Nuevo" });
    createInvitation.mockResolvedValue({ invitation: { id: "inv1", token: "tok" } });

    await provisionTenant({
      slug: "nuevo",
      host: "nuevo.localhost:3000",
      nombre: "Taller Nuevo",
      paquete: "basico",
      admin: { email: "owner@nuevo.cl", name: "Dueño" },
      invitedById: "superadmin-id",
      correlativoInicial: 1247,
    });

    expect(configUpsert).toHaveBeenCalledWith({
      where: { tenantId: "nuevo-id" },
      update: {},
      create: { tenantId: "nuevo-id", correlativoActual: 1247 },
    });
  });

  it("devuelve el tenant y la invitación creados", async () => {
    const tenant = { id: "nuevo-id", slug: "nuevo", nombre: "Taller Nuevo" };
    const invitation = { id: "inv1", token: "tok" };
    upsert.mockResolvedValue(tenant);
    createInvitation.mockResolvedValue({ invitation });

    await expect(
      provisionTenant({
        slug: "nuevo",
        host: "nuevo.localhost:3000",
        nombre: "Taller Nuevo",
        paquete: "completo",
        admin: { email: "owner@nuevo.cl", name: "Dueño" },
        invitedById: "superadmin-id",
      }),
    ).resolves.toEqual({ tenant, invitation });
  });
});
