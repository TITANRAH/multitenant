import { NextResponse, type NextRequest } from "next/server";

// Talleres semilla del Sprint 1. En el Sprint 2 esto se reemplaza por una
// consulta a la tabla Tenant (o una caché de esa consulta); por ahora el
// proxy no toca la base de datos.
const HOST_TO_SLUG: Record<string, string> = {
  "tccars.localhost:3000": "tccars",
  "tccars.localhost": "tccars",
  "demo.localhost:3000": "demo",
  "demo.localhost": "demo",
};

export default function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const slug = HOST_TO_SLUG[host];

  if (!slug) {
    return new NextResponse("Taller no encontrado", { status: 404 });
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${slug}${url.pathname}`;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    // Todo excepto assets estáticos, imágenes de Next y el favicon.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
