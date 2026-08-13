import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import proxy from "@/proxy";

function requestFor(host: string, pathname = "/") {
  return new NextRequest(`http://placeholder.local${pathname}`, {
    headers: host ? { host } : {},
  });
}

describe("proxy", () => {
  it("reescribe un host conocido a /[slug]/... sin cambiar la URL visible", () => {
    const response = proxy(requestFor("tccars.localhost:3000", "/"));

    expect(response.status).toBe(200);
    // Next expone el destino del rewrite en este header interno.
    // trailingSlash: false (default) normaliza "/tccars/" a "/tccars".
    const rewriteUrl = new URL(response.headers.get("x-middleware-rewrite")!);
    expect(rewriteUrl.pathname).toBe("/tccars");
  });

  it("reescribe manteniendo el resto del path", () => {
    const response = proxy(requestFor("demo.localhost:3000", "/ordenes"));

    const rewriteUrl = new URL(response.headers.get("x-middleware-rewrite")!);
    expect(rewriteUrl.pathname).toBe("/demo/ordenes");
  });

  it("devuelve 404 'Taller no encontrado' para un host que no está en el mapa", async () => {
    const response = proxy(requestFor("noexiste.localhost:3000", "/"));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Taller no encontrado");
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("no reescribe cuando no hay header host", () => {
    const response = proxy(requestFor(""));

    expect(response.status).toBe(404);
  });
});
