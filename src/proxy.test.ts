import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getTenantSlugByHost = vi.fn();
vi.mock("@/lib/db", () => ({
  getTenantSlugByHost: (host: string) => getTenantSlugByHost(host),
}));

const { default: proxy } = await import("@/proxy");

function requestFor(host: string, pathname = "/") {
  return new NextRequest(`http://placeholder.local${pathname}`, {
    headers: host ? { host } : {},
  });
}

beforeEach(() => {
  getTenantSlugByHost.mockReset();
});

describe("proxy", () => {
  it("reescribe un host conocido a /[slug]/... sin cambiar la URL visible", async () => {
    getTenantSlugByHost.mockResolvedValue("tccars");

    const response = await proxy(requestFor("tccars.localhost:3000", "/"));

    expect(getTenantSlugByHost).toHaveBeenCalledWith("tccars.localhost:3000");
    expect(response.status).toBe(200);
    // Next expone el destino del rewrite en este header interno.
    // trailingSlash: false (default) normaliza "/tccars/" a "/tccars".
    const rewriteUrl = new URL(response.headers.get("x-middleware-rewrite")!);
    expect(rewriteUrl.pathname).toBe("/tccars");
  });

  it("reescribe manteniendo el resto del path", async () => {
    getTenantSlugByHost.mockResolvedValue("demo");

    const response = await proxy(requestFor("demo.localhost:3000", "/ordenes"));

    const rewriteUrl = new URL(response.headers.get("x-middleware-rewrite")!);
    expect(rewriteUrl.pathname).toBe("/demo/ordenes");
  });

  it("devuelve 404 'Taller no encontrado' para un host que no existe en la tabla Tenant", async () => {
    getTenantSlugByHost.mockResolvedValue(null);

    const response = await proxy(requestFor("noexiste.localhost:3000", "/"));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Taller no encontrado");
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("no reescribe cuando no hay header host", async () => {
    const response = await proxy(requestFor(""));

    expect(getTenantSlugByHost).toHaveBeenCalledWith("");
    expect(response.status).toBe(404);
  });
});
