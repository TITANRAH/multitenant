import { beforeEach, describe, expect, it, vi } from "vitest";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));

const { hasRole, assertRole, assertRoleOrNotFound, InsufficientRoleError } =
  await import("@/lib/auth/assertRole");

beforeEach(() => {
  notFound.mockClear();
});

describe("hasRole — jerarquía MECANICO < RECEPCION < ADMIN < OWNER", () => {
  it("un OWNER alcanza cualquier mínimo", () => {
    expect(hasRole("OWNER", "OWNER")).toBe(true);
    expect(hasRole("OWNER", "ADMIN")).toBe(true);
    expect(hasRole("OWNER", "RECEPCION")).toBe(true);
    expect(hasRole("OWNER", "MECANICO")).toBe(true);
  });

  it("un MECANICO solo alcanza el mínimo MECANICO", () => {
    expect(hasRole("MECANICO", "MECANICO")).toBe(true);
    expect(hasRole("MECANICO", "RECEPCION")).toBe(false);
    expect(hasRole("MECANICO", "ADMIN")).toBe(false);
    expect(hasRole("MECANICO", "OWNER")).toBe(false);
  });

  it("un rol intermedio alcanza los de abajo pero no los de arriba", () => {
    expect(hasRole("ADMIN", "RECEPCION")).toBe(true);
    expect(hasRole("ADMIN", "MECANICO")).toBe(true);
    expect(hasRole("ADMIN", "OWNER")).toBe(false);
  });
});

describe("assertRole (gate de server actions)", () => {
  it("no lanza cuando el rol alcanza", () => {
    expect(() => assertRole("OWNER", "ADMIN")).not.toThrow();
  });

  it("lanza InsufficientRoleError cuando el rol no alcanza", () => {
    expect(() => assertRole("MECANICO", "ADMIN")).toThrow(InsufficientRoleError);
  });
});

describe("assertRoleOrNotFound (gate de página)", () => {
  it("no corta la ejecución cuando el rol alcanza", () => {
    expect(() => assertRoleOrNotFound("ADMIN", "ADMIN")).not.toThrow();
    expect(notFound).not.toHaveBeenCalled();
  });

  it("llama a notFound() cuando el rol no alcanza", () => {
    expect(() => assertRoleOrNotFound("RECEPCION", "ADMIN")).toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(notFound).toHaveBeenCalledOnce();
  });
});
