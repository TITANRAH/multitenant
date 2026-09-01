import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const findMany = vi.fn();

vi.mock("@/lib/db/client", () => ({
  prisma: { tenant: { findUnique, findMany } },
}));

const { getTenantBySlug, listTenants } = await import("@/lib/db/lookup");

beforeEach(() => {
  findUnique.mockReset();
  findMany.mockReset();
});

describe("getTenantBySlug", () => {
  it("consulta la tabla Tenant por slug, seleccionando solo id/slug/nombre", async () => {
    findUnique.mockResolvedValue({
      id: "tccars-id",
      slug: "tccars",
      nombre: "TCcars",
    });

    const tenant = await getTenantBySlug("tccars");

    expect(tenant).toEqual({ id: "tccars-id", slug: "tccars", nombre: "TCcars" });
    expect(findUnique).toHaveBeenCalledWith({
      where: { slug: "tccars" },
      select: { id: true, slug: true, nombre: true },
    });
  });

  it("devuelve null cuando el slug no existe", async () => {
    findUnique.mockResolvedValue(null);

    await expect(getTenantBySlug("no-existe")).resolves.toBeNull();
  });

  it("nunca filtra por tenantId (es la única consulta que no pasa por forTenant)", async () => {
    findUnique.mockResolvedValue(null);

    await getTenantBySlug("tccars");

    const callArgs = findUnique.mock.calls[0][0];
    expect(callArgs.where).toEqual({ slug: "tccars" });
  });
});

describe("listTenants", () => {
  it("excluye el tenant especial 'plataforma'", async () => {
    findMany.mockResolvedValue([]);

    await listTenants();

    expect(findMany).toHaveBeenCalledWith({
      where: { slug: { not: "plataforma" } },
      select: { id: true, slug: true, host: true, nombre: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
  });

  it("devuelve los talleres encontrados", async () => {
    const tenants = [
      { id: "t1", slug: "tccars", host: "tccars.localhost:3000", nombre: "TCcars", createdAt: new Date() },
    ];
    findMany.mockResolvedValue(tenants);

    await expect(listTenants()).resolves.toEqual(tenants);
  });
});
