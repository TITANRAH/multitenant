import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const forTenant = vi.fn(() => ({
  tenantFeature: { findFirst },
}));
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("@/lib/db", () => ({ forTenant: (tenantId: string) => forTenant(tenantId) }));
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));

const {
  hasFeature,
  assertFeature,
  assertFeatureOrNotFound,
  FeatureNotEnabledError,
} = await import("@/features/assertFeature");

beforeEach(() => {
  findFirst.mockReset();
  forTenant.mockClear();
  notFound.mockClear();
});

describe("hasFeature", () => {
  it("devuelve true cuando existe una fila activa sin vencimiento", async () => {
    findFirst.mockResolvedValue({ enabled: true, expiresAt: null });

    await expect(hasFeature("tccars-id", "agenda")).resolves.toBe(true);
    expect(forTenant).toHaveBeenCalledWith("tccars-id");
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        featureKey: "agenda",
        enabled: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }],
      },
    });
  });

  it("devuelve false cuando no existe fila para ese taller/feature", async () => {
    findFirst.mockResolvedValue(null);

    await expect(hasFeature("demo-id", "agenda")).resolves.toBe(false);
  });
});

describe("assertFeature (gate de server actions)", () => {
  it("no lanza cuando la feature está activa", async () => {
    findFirst.mockResolvedValue({ enabled: true, expiresAt: null });

    await expect(assertFeature("tccars-id", "agenda")).resolves.toBeUndefined();
  });

  it("lanza FeatureNotEnabledError cuando la feature no está activa", async () => {
    findFirst.mockResolvedValue(null);

    await expect(assertFeature("demo-id", "agenda")).rejects.toBeInstanceOf(
      FeatureNotEnabledError,
    );
  });
});

describe("assertFeatureOrNotFound (gate de página)", () => {
  it("no corta la ejecución cuando la feature está activa", async () => {
    findFirst.mockResolvedValue({ enabled: true, expiresAt: null });

    await expect(
      assertFeatureOrNotFound("tccars-id", "agenda"),
    ).resolves.toBeUndefined();
    expect(notFound).not.toHaveBeenCalled();
  });

  it("llama a notFound() cuando la feature no está activa", async () => {
    findFirst.mockResolvedValue(null);

    await expect(assertFeatureOrNotFound("demo-id", "agenda")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(notFound).toHaveBeenCalledOnce();
  });
});
