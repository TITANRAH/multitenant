import { NextResponse, type NextRequest } from "next/server";
import { getTenantSlugByHost } from "@/lib/db";

// Sprint 2: el host ahora se resuelve consultando la tabla Tenant (antes
// era un mapa fijo). Esto es lo que permite agregar talleres (o el tenant
// especial "plataforma") sin tocar este archivo ni desplegar.
export default async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const slug = await getTenantSlugByHost(host);

  if (!slug) {
    return new NextResponse("Taller no encontrado", { status: 404 });
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${slug}${url.pathname}`;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    // Todo excepto assets estáticos, imágenes de Next, el favicon y /api.
    // /api/auth/* (NextAuth) vive en la raíz, fuera de [tenant] — si se
    // reescribe queda buscando /<slug>/api/auth/*, que no existe, y
    // signIn() recibe un 404 en HTML en vez de la respuesta JSON esperada.
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
