
cat > CLAUDE.md << 'EOF'
# SaaS multi-tenant para talleres mecánicos

Plan completo, arquitectura y los 15 sprints: `docs/plan.md`.
Léelo antes de cualquier decisión de arquitectura, modelado o alcance.

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind · shadcn/ui · Prisma ·
PostgreSQL (Neon) · Cloudflare R2 (imágenes) · Resend (email) · Claude API (chatbox)

## Comandos
npm run dev
npm run build
npx prisma migrate dev
npx prisma studio

## Estructura
proxy.ts            resuelve el taller desde el host y reescribe a /[tenant]
src/app/[tenant]/   panel del taller, portal del cliente y vitrina pública
src/lib/db/         ÚNICO lugar donde vive el cliente Prisma
src/features/       registro de módulos y de features activables por taller

## Next 16, no 15
- La resolución de tenant va en `proxy.ts`, NO en `middleware.ts`
- `params`, `cookies()` y `headers()` son async: siempre con `await`
- El caché es explícito con `use cache`. No existe caché implícito

## Reglas no negociables
1. Nunca `if (tenant === 'x')`. Toda diferencia entre talleres es una feature
   o un campo de configuración
2. Nunca importar el cliente Prisma fuera de `src/lib/db`. Siempre `forTenant(tenantId)`
3. Toda server action abre con `assertFeature` y `assertRole`
4. Dinero en `BigInt` de pesos, nunca `Float`. Neto, IVA y total en columnas separadas
5. Movimientos contables y de stock son append-only: nunca UPDATE, siempre reversa
6. Precio y stock cuelgan de la variante, nunca del producto
7. Las fotos suben del navegador directo a R2 con presigned URL, nunca por el servidor
8. Todo índice de consulta empieza por `tenantId`
9. `observaciones` (visible al cliente) y `notasInternas` nunca se mezclan
10. La orden de trabajo guarda `clienteId` explícito, no lo deduce del vehículo
11. Todo desarrollo trae sus tests. Ningún módulo, feature o función de
    `src/lib/db` se da por terminado sin su test co-ubicado (ver sección Testing)
12. Toda UI se construye con componentes de shadcn/ui (`src/components/ui/`,
    instalados con `npx shadcn@latest add <componente>`), nunca HTML a mano
    con clases Tailwind sueltas. Si falta el componente, se agrega con el CLI
    antes de escribir el formulario/vista

## Testing
- Framework: Vitest (`npm test` corre toda la suite una vez, `npm run test:watch`
  para desarrollo, `npm run test:coverage` para cobertura)
- **Cada archivo con lógica trae su test al lado, en la misma carpeta**:
  `src/features/registry.ts` → `src/features/registry.test.ts`,
  `src/lib/db/tenant.ts` → `src/lib/db/tenant.test.ts`, etc. Nada de una
  carpeta `__tests__/` separada del código que prueba
- Nunca tocar la base real ni Neon desde un test: mockear `@/lib/db/client`
  (o el barrel `@/lib/db`) con `vi.mock`
- Un módulo nuevo (Sprint 2 en adelante) no se considera terminado hasta que
  tiene su `.test.ts` co-ubicado y `npm test` pasa en verde

## Cómo trabajar
- Si algo que pido contradice `docs/plan.md`, dilo antes de escribir código
- Si un requerimiento no encaja en ningún módulo existente, propón el módulo
  antes de programar
- No avances al siguiente sprint sin que te lo pida
- **Al cerrar cada sprint**, generar un diagrama de secuencia explicativo de
  todo lo construido en ese sprint: con nombre de archivo en cada
  participante/paso, y el propósito de por qué existe cada pieza de código
  (no solo qué hace). Guardarlo en `docs/aprendizaje/NN-nombre.md` siguiendo
  el mismo formato que `03-flujo-resolucion-tenant.md`
EOF

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
