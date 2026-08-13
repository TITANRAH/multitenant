# Arranque — pasos hasta el Sprint 1

Guarda este archivo como `docs/setup.md` dentro de `multi-tenant`.

---

## Ya está hecho

- [x] Carpeta `multi-tenant` con git iniciado
- [x] `docs/plan.md` — el plan completo
- [x] Next.js 16 con TypeScript, ESLint, Tailwind, `src/`, App Router
- [x] `CLAUDE.md` con las reglas del proyecto
- [x] Node 22 fijado en `.nvmrc`
- [x] Prisma 7.9.1 instalado (`prisma/` + `prisma.config.ts`)
- [x] Skills de Prisma en `.agents/skills/`
- [x] Proyecto Neon creado — Postgres 18, región us-east-1, branch `production`
- [x] `.env` con `DATABASE_URL` (pooled) y `DIRECT_URL` (unpooled)
- [x] `@prisma/adapter-neon@7.9.1` instalado

> `DATABASE_URL` la usa la app (miles de queries cortas).
> `DIRECT_URL` la usa `prisma migrate` (operaciones largas que el pooler no soporta).

**El entorno está completo.** Lo que sigue es código.

---

## Paso 1 — Verificar que nada secreto se va al repo

```bash
git status --short
```

`.env` **no** debe aparecer en la lista. Si aparece, revisa `.gitignore` antes de commitear.

```bash
git add .
git commit -m "chore: setup inicial Next 16 + Prisma 7 + Neon"
```

---

## Paso 2 — Arrancar Claude Code

Abre la terminal en `multi-tenant` y lanza Claude Code. Primer mensaje:

```
Lee CLAUDE.md y docs/plan.md completos antes de escribir nada.

Ejecuta el Sprint 1 del plan.

Restricciones:
- Next.js 16: la resolución de tenant va en proxy.ts, NO en middleware.ts.
  params, cookies() y headers() son async.
- Prisma 7 con @prisma/adapter-neon. Usa las skills de .agents/skills/
  para la sintaxis correcta de la v7.
- Las 10 reglas de CLAUDE.md aplican a todo el código.

Muéstrame primero la lista de archivos que vas a crear y espera mi
aprobación. No avances al Sprint 2.
```

**Orden esperado del Sprint 1:**

1. `prisma/schema.prisma` — Tenant, TenantConfig, TenantFeature, User
2. `src/lib/db/` — cliente Prisma + adapter + extensión `forTenant()`
3. `proxy.ts` — resuelve el taller desde el host y reescribe a `/[tenant]`
4. `src/features/registry.ts` — catálogo de features + `assertFeature`
5. `src/app/[tenant]/` — layout base
6. Regla de ESLint: prohibido importar Prisma fuera de `src/lib/db`
7. Seed con dos talleres de prueba, con features distintas
8. `Dockerfile`

> Si te propone empezar por componentes o pantallas, frénalo.
> El Sprint 1 no tiene UI.

---

## Paso 3 — Criterio de salida

El Sprint 1 está terminado cuando se cumplen las cuatro:

- [ ] Dos talleres seed responden en hosts distintos y cada uno ve solo sus datos
- [ ] Un módulo desactivado devuelve 404, tanto por menú como escribiendo la URL
- [ ] Ninguna importación de Prisma fuera de `src/lib/db` (lo verifica ESLint)
- [ ] `npm run build` pasa sin errores

Para probar subdominios en local, en `/etc/hosts`:

```
127.0.0.1 tccars.localhost
127.0.0.1 demo.localhost
```

---

## Después del Sprint 1

Actualiza la sección **Estado actual** al final de `docs/plan.md`, haz commit,
y sube el `plan.md` actualizado al knowledge del Project de Claude.

---

## Sobre el diseño de TCcars

El PNG lo puedes arrastrar directo a Claude Code — lee imágenes sin
configuración extra. Pero **no en el Sprint 1**: la identidad visual es
el Sprint 10 y la vitrina el Sprint 6.

Lo único que conviene hacer ahora es extraer los tokens del diseño
(colores, tipografía, radios, espaciados) y dejarlos como valores por
defecto en `TenantConfig`.

**Advertencia:** ese diseño es la configuración de UN taller, no el diseño
del sistema. Si los colores de TCcars terminan escritos en el CSS, rompiste
la regla número 1 y el segundo taller te obliga a refactorizar todo. El
diseño se implementa como layout genérico alimentado por CSS variables que
salen de la base de datos.
