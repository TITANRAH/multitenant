# Plan de ejecución — SaaS multiservicio para talleres mecánicos

**Stack:** Next.js 16 (App Router) · Prisma · PostgreSQL (Neon) · Cloudflare R2 · Resend · Claude API
**Modelo:** multi-tenant, una sola base de código, features activables por taller

---

## 1. Principio rector

> **Una sola base de código. Cero forks. Todas las diferencias entre talleres viven en datos, nunca en código.**

Cada vez que estés por escribir `if (tenant === 'tallerX')`, detente: eso es una feature flag o un campo de configuración que no modelaste. Esta regla es la que hace que agregar el taller número 20 cueste 10 minutos en vez de una semana.

Consecuencia práctica: si un taller pide algo que no se puede expresar como configuración, la respuesta no es un caso especial — es un módulo nuevo que los demás también pueden comprar.

---

## 2. Modelo de features y precios

Esta es la pieza central del negocio: le cobras a cada taller según lo que use.

### 2.1 Catálogo en código, activación en datos

El catálogo de features vive en el repo (es código, se versiona, se testea). La activación vive en la base.

```ts
// features/registry.ts
export const FEATURES = {
  ordenes:       { label: 'Órdenes de trabajo', requires: [] },
  agenda:        { label: 'Agendamiento',       requires: ['ordenes'] },
  recordatorios: { label: 'Recordatorios',      requires: ['agenda'] },
  whatsapp:      { label: 'Recordatorios WhatsApp', requires: ['recordatorios'] },
  contabilidad:  { label: 'Contabilidad y dashboard', requires: ['ordenes'] },
  portal:        { label: 'Portal del cliente', requires: ['ordenes'] },
  mostrario:     { label: 'Mostrario de productos', requires: [] },
  videos:        { label: 'Galería y redes',    requires: [] },
  chatbox:       { label: 'Asistente IA',       requires: ['ordenes'] },
  tienda:        { label: 'Tienda online',      requires: ['mostrario'] },
  pagos:         { label: 'Medios de pago',     requires: ['tienda'] },
} as const;
```

```prisma
model TenantFeature {
  tenantId   String
  featureKey String
  enabled    Boolean  @default(true)
  config     Json?     // límites, credenciales, parámetros por taller
  expiresAt  DateTime? // para trials
  @@id([tenantId, featureKey])
}
```

`requires` no es decorativo: al activar `tienda` el sistema valida que `mostrario` esté activo. Sin eso vas a tener talleres con carrito y sin catálogo.

### 2.2 Los tres niveles de gate

| Nivel | Dónde | Para qué |
|---|---|---|
| Navegación | Sidebar y menús | Que no vea lo que no compró |
| Ruta | Layout del módulo | Que no entre escribiendo la URL |
| **Servidor** | Server actions y route handlers | **La barrera real** |

Los dos primeros son UX. El tercero es seguridad. Un `assertFeature(tenantId, 'contabilidad')` al inicio de cada server action del módulo. Sin esa línea, ocultar el menú no protege nada.

### 2.3 Paquetes como plantilla, no como estructura

Los planes comerciales son **plantillas de alta**, no una jerarquía en la base. Al crear un taller eliges un paquete y este expande sus features a filas individuales de `TenantFeature`. Después puedes activarle una feature suelta sin romper nada.

| Paquete | Features |
|---|---|
| Básico | ordenes, agenda |
| Operativo | + recordatorios, portal, contabilidad |
| Completo | + mostrario, videos, chatbox |
| Add-ons sueltos | whatsapp, tienda, pagos |

Si guardaras `tenant.plan = 'basico'` y consultaras el plan en cada gate, el día que un cliente del plan Básico te pida solo contabilidad tendrías que inventar un plan nuevo. Con features individuales, es un toggle.

### 2.4 Configuración por taller

Separa dos cosas que se confunden:

- **`TenantFeature.config`** — parámetros de una feature: días de anticipación del recordatorio, número de WhatsApp, credenciales de pago.
- **`TenantConfig`** — identidad visual: logo, colores, tipografía, variante de layout, redes sociales, datos de contacto.

---

## 3. Alta de un taller nuevo

Objetivo medible: **de cero a operativo en menos de 15 minutos, sin tocar código ni desplegar.**

Un asistente en el panel de plataforma que hace, en una transacción:

1. Crea el `Tenant` con su slug y subdominio
2. Aplica el paquete elegido → expande a `TenantFeature`
3. Crea el `TenantConfig` con branding por defecto (o el que subas ahí mismo)
4. Crea el usuario admin y le envía la invitación
5. Siembra datos base: categorías de gastos, servicios frecuentes, estados de OT, plantillas de formulario estándar

El paso 5 es el que la gente olvida y es el que hace la diferencia entre entregar un sistema vacío y uno que se puede usar el primer día.

---

## 4. Stack y hosting

| Capa | Elección | Costo |
|---|---|---|
| App | Next.js en Vercel | Hobby mientras no cobres; Pro (USD 20/mes) desde el primer taller pagando |
| Base de datos | Neon Postgres | Free: 0,5 GB y 100 CU-horas por proyecto |
| Imágenes y PDFs | Cloudflare R2 | Free: 10 GB, egreso $0, permanente |
| Email | Resend | Free: 3.000/mes, tope 100/día |
| Videos | YouTube/Instagram del taller, solo se guarda la URL | $0 |
| Dominio | ~USD 12/año | Único gasto fijo real |

**Nota sobre Vercel:** el plan Hobby prohíbe uso comercial y sus cron jobs corren una sola vez al día. Con Pro obtienes cron por minuto y timeout de 60s (ampliable a 300s), suficiente para correr los recordatorios desde el propio Next.js. Mantén el Dockerfile al día de todos modos: es tu seguro para migrar a otro hosting si Vercel se encarece.

### 4.1 Particularidades de Next.js 16

Cinco cambios respecto a la versión 15 que afectan directamente a este plan:

| Cambio | Impacto |
|---|---|
| **`middleware.ts` → `proxy.ts`** | La resolución de tenant por host vive acá. Es el archivo más importante del Sprint 1 |
| **Cache Components (`use cache`)** | El caché es explícito y opt-in; todo lo dinámico corre en request time por defecto. Reemplaza a `revalidate` para la vitrina pública |
| **`params`, `cookies()` y `headers()` son async** | Se esperan con `await` en toda página y server action |
| **Turbopack por defecto + React Compiler estable** | Builds más rápidos, memoización automática. Nada que configurar |
| **`next lint` eliminado** | Las reglas propias (prohibir Prisma crudo) van en config de ESLint directa |

**Sobre agentes de código:** `create-next-app` genera `AGENTS.md` y Next 16.3 sirve documentación versionada a los agentes. Mantén un solo archivo de reglas y que el otro lo referencie, para no tener dos fuentes de verdad divergiendo.

---

## 5. Etapas

| # | Etapa | Sprints | Resultado |
|---|---|---|---|
| 0 | Fundaciones | 1 | Multi-tenancy y sistema de features funcionando |
| 1 | Identidad y alta | 2 | Alta de taller en 15 min, roles operativos |
| 2 | Núcleo operativo | 3–4 | El taller reemplaza su cuaderno |
| 3 | Agenda y recordatorios | 5–6 | **Primer taller en producción** |
| 4 | Contabilidad y dashboard | 7–8 | **Producto vendible** |
| 5 | Portal del cliente | 9 | El cliente final entra al sistema |
| 6 | Identidad visual y vitrinas | 10–12 | Diferenciación por taller |
| 7 | Chatbox | 13–14 | Diferenciador competitivo |
| 8 | Tienda y pagos | 15+ | Nueva línea de ingresos |

---

## 6. Sprints

**Supuestos:** sprints de 2 semanas, ~20–25 horas de trabajo efectivo cada uno (compatible con empleo full-time). Total estimado: ~7 meses hasta el chatbox. Ajusta la duración si tu disponibilidad cambia, pero **no cambies el orden**: cada sprint depende del anterior.

---

### Sprint 1 — Fundaciones

**Objetivo:** que dos talleres semilla coexistan aislados con features distintas.

- Proyecto Next.js único en la raíz + Dockerfile
- Schema Prisma base: `Tenant`, `TenantConfig`, `TenantFeature`, `User`
- **`proxy.ts`** con resolución de tenant por host → `/[tenant]/...`
- Extensión de Prisma `forTenant(tenantId)` que inyecta `tenantId` en todo `where` y `create`
- Registro de módulos y de features + helper `assertFeature`
- Regla de ESLint: prohibido importar el cliente Prisma crudo fuera de `src/lib/db`
- `AGENTS.md` / `CLAUDE.md` con las reglas no negociables de la sección 7

**Definición de hecho:** dos tenants seed en subdominios distintos, con features diferentes, y el módulo desactivado devuelve 404 tanto por navegación como por URL directa.

---

### Sprint 2 — Identidad, roles y alta

**Objetivo:** dar de alta un taller sin tocar la base a mano.

- Auth con `User.tenantId` + `platformRole` (para tu cuenta de plataforma)
- Roles: `OWNER`, `ADMIN`, `RECEPCION`, `MECANICO` + helper `assertRole`
- Invitaciones por email
- Panel de plataforma: asistente de alta de taller (paquete, branding, admin, seed)
- **Correlativo de mantenciones inicializable en el alta** — los talleres llegan con historial y su numeración debe continuar, no reiniciarse en 1
- Bloqueo optimista genérico: columna `version` y helper de actualización

**Definición de hecho:** creas un taller completo desde el panel en menos de 15 minutos, el admin recibe su invitación y entra a un sistema con datos base sembrados.

---

### Sprint 3 — Clientes, vehículos y órdenes de trabajo

**Objetivo:** el núcleo que usa el mecánico todos los días.

- CRUD de clientes y vehículos (patente como identificador natural, validada)
- **Vehículo con marca, modelo y patente en campos separados** — no un texto único
- **Cliente con teléfono y correo obligatorios** — sin ellos no hay recordatorios ni portal
- Órdenes de trabajo con estados, asignación a mecánico y bloqueo optimista
- **Kilometraje de entrada y kilometraje de próxima mantención** en cada OT — es el disparador del recordatorio
- **Correlativo por taller** en la OT, continuo desde el número con que llegó el taller
- **La OT guarda `clienteId` y `vehiculoId` al momento de la atención** — no se deduce el cliente desde el vehículo (los autos cambian de dueño)
- **Separación desde el modelado:** `observaciones` (visible al cliente) vs `notasInternas` (solo el taller)
- Costos internos marcados como no expuestos
- Listado y filtros de OT

**Definición de hecho:** dos usuarios editan la misma OT en simultáneo y el segundo recibe conflicto en vez de pisar el trabajo del primero.

---

### Sprint 4 — Formularios, fotos e informes

**Objetivo:** que la OT produzca un documento entregable.

- `FormTemplate` (JSON schema) + `FormSubmission` (JSONB), validación con Zod generada desde el schema
- **`LineaOT` con dos tipos: cobrable (precio unitario, cantidad, tasa de IVA propia) y descriptiva (solo texto, agrupada bajo una cobrable)** — el formato real mezcla ambas
- **La tasa de IVA es por línea, no global** — en un mismo documento conviven líneas al 19% y al 0%
- **Totales calculados por el sistema sumando líneas**, nunca ingresados a mano
- Renderizador dinámico de formularios
- Subida de fotos **directa del navegador a R2 con presigned URL** (nunca a través de la función serverless)
- Compresión en cliente antes de subir
- Generación de PDF con `@react-pdf/renderer`, con el logo del taller desde su `TenantConfig`

**Definición de hecho:** un mecánico completa un informe con 5 fotos desde el celular y descarga el PDF con la marca del taller.

---

### Sprint 5 — Agenda

**Objetivo:** gestionar la carga de trabajo del taller.

- Calendario con vista día/semana
- Agendamiento manual, reagendar, cancelar
- Horarios de atención y capacidad por taller (en `TenantFeature.config` de `agenda`)
- Vinculación cita ↔ vehículo ↔ cliente
- Feature flag `agenda` aplicado en los tres niveles

**Definición de hecho:** una cita agendada genera automáticamente una OT en borrador al confirmarse.

---

### Sprint 6 — Recordatorios · **Primer taller en producción**

**Objetivo:** el sistema actúa solo, sin que nadie lo abra.

- Tabla `Notificacion` con estado, reintentos y trazabilidad
- Cron de Vercel cada 5 minutos llamando a una ruta protegida con `CRON_SECRET`
- Envío por email vía Resend, con plantilla que hereda el branding del taller
- **Link directo a reagendar** en cada correo — esto es lo que hace que el portal se use después
- Reglas de recordatorio configurables: días antes de la cita, kilometraje, tiempo desde la última mantención
- WhatsApp detrás del flag `whatsapp`, con plantillas de utilidad aprobadas

**Definición de hecho:** programas una cita para mañana, cierras todo, y el recordatorio sale solo con el link funcionando. Un envío fallido se reintenta y queda registrado.

> **Hito:** acá puedes poner al primer taller a operar de verdad. Todo lo siguiente se construye con feedback real.

---

### Sprint 7 — Contabilidad

**Objetivo:** que el dueño vea su plata.

- `MovimientoContable` **append-only** — nunca `UPDATE`, siempre reversa
- Montos en `BigInt` de pesos; **neto, IVA y total en columnas separadas**
- Campo `origen`: `ORDEN_TRABAJO | MANUAL`
- Ingreso automático al cerrar una OT
- Ingreso manual de egresos y gastos, con categorías editables por taller
- Feature `contabilidad` restringida a `ADMIN` y `OWNER` — **y esta tabla entra a la lista corta de RLS**

**Definición de hecho:** un mecánico autenticado no puede leer un solo movimiento contable, ni por UI ni llamando directo al server action.

---

### Sprint 8 — Dashboard y buscador · **Producto vendible**

**Objetivo:** la pantalla que justifica el precio.

- **Métrica principal: clientes distintos atendidos** por semana/mes/año (`COUNT(DISTINCT clienteId)` sobre OT cerradas en el período) — un cliente con 3 visitas cuenta 1
- Métricas complementarias: total de atenciones, y el ratio atenciones/cliente como indicador de recurrencia
- Gráficos: ingresos vs egresos, servicios más frecuentes
- Buscador global de clientes con acceso a toda su documentación — visible para `MECANICO`, `ADMIN` y `OWNER`
- Exportación a Excel/CSV
- Índices `(tenantId, fecha)` en todo lo que se agrupe por tiempo

**Definición de hecho:** el dashboard carga en menos de 2 segundos con un año de datos simulados. Sin vistas materializadas — si hace falta optimizar, se mide primero.

> **Hito:** con esto tienes un producto completo que se vende solo en una demo.

---

### Sprint 9 — Portal del cliente

**Objetivo:** el dueño del vehículo entra por su cuenta.

- `Customer` como tabla e identidad **separada** de `User` (no un rol más)
- Login sin contraseña: magic link u OTP — la cuenta la crea el taller, no hay registro abierto
- Dashboard móvil primero: vehículos, próxima cita arriba de todo
- **Hoja de vida del cliente**: todas sus atenciones a través de todos sus vehículos, con PDFs y fotos. Filtrada por `clienteId`, nunca por vehículo
- **Doble filtro en cada query: `tenantId` + `clienteId`**
- Agendar, reagendar y cancelar desde el portal

**Definición de hecho:** un cliente entra desde el link del correo en el celular, ve su historial y mueve una cita. No ve ninguna nota interna ni ningún costo del taller.

---

### Sprint 10 — Identidad visual

**Objetivo:** que cada taller se vea suyo.

- Panel de branding: logo, colores, tipografía
- Colores inyectados como CSS variables en el layout raíz
- 2–3 variantes de layout de portada seleccionables
- Soporte de dominio propio para el plan alto
- Emails y PDFs heredando el mismo branding

**Definición de hecho:** cambias el logo y la paleta de un taller desde el panel y se reflejan en la app, el portal, los correos y los PDFs sin desplegar.

---

### Sprint 11 — Mostrario de productos y servicios

**Objetivo:** vitrina pública, modelada como tienda desde el inicio.

- `Producto` + **`ProductoVariante`** (aunque cada producto tenga una sola) — precio y stock cuelgan de la variante, nunca del producto
- `MovimientoStock` **append-only** con origen `COMPRA | ORDEN_TRABAJO | VENTA | AJUSTE` — el stock es la suma, nunca una columna que se actualiza
- **Consumo de productos desde la OT descuenta del mismo inventario**
- `ProductoCompatibilidad`: marca, modelo, año desde/hasta
- Flags `permiteVenta` (false por ahora) y `mostrarPrecio`
- Catálogo de servicios con precio referencial
- Vitrina pública sin login, cacheada con `use cache` y cache tags por tenant (invalidadas al editar un producto)

**Definición de hecho:** una mantención que usa 4 litros de aceite deja el stock del mostrario correcto sin intervención manual. El cliente ve en su portal los productos compatibles con su vehículo.

---

### Sprint 12 — Videos y redes

**Objetivo:** que el taller muestre su trabajo.

- Galería de videos por URL de YouTube/Instagram — **nada de alojar video**
- Embed responsivo y Open Graph por página para que compartir se vea bien
- Botones de compartir en vitrina, servicios y galería
- Sitemap y metadata por tenant

**Definición de hecho:** pegas un link de YouTube, queda en la galería, y al compartir la URL en WhatsApp aparece con imagen, título y la marca del taller.

---

### Sprints 13–14 — Chatbox

**Objetivo:** consultar y agendar conversando.

**Sprint 13 — solo lectura.** Tools tipadas con `tenantId` inyectado **del lado servidor desde la sesión, jamás desde el mensaje**. Dos toolsets separados:

- *Mecánico:* buscar cliente, historial de vehículo, última mantención, stock de un producto
- *Cliente:* mis vehículos, mis documentos, mis citas

**Sprint 14 — escritura.** Agendar, reagendar y cancelar, siempre con confirmación explícita del usuario antes de ejecutar. Historial de conversación y límite de uso por taller en `TenantFeature.config`.

**Definición de hecho:** un cliente que escribe "dame los datos de todos los clientes del taller" no obtiene nada, porque esa herramienta no existe en su toolset. La seguridad está en lo que no le das, no en el prompt.

---

### Sprint 15+ — Tienda y medios de pago

**Objetivo:** nueva línea de ingresos para el taller y para ti.

- Encender `permiteVenta`: carrito, `Pedido` (nombre distinto de `OrdenTrabajo` para no confundirlos), estados de despacho
- Descuento de stock contra el mismo `MovimientoStock`
- Ingresos de venta al mismo libro contable
- **Medios de pago:** cada taller cobra con sus propias credenciales de Flow o Webpay, cifradas en `TenantFeature.config` de `pagos`. La alternativa es un modelo marketplace con split — decídelo cuando tengas el primer taller que quiera vender

**Definición de hecho:** un cliente compra desde la vitrina, paga con las credenciales del taller, el stock baja y el ingreso aparece en el libro contable.

---

## Anexo A — Bootstrap

Lo que haces a mano antes de que Claude Code tome el control.

```bash
mkdir multitenant && cd multitenant
git init
mkdir docs                    # copiar el plan a docs/plan.md
git add . && git commit -m "docs: plan de ejecución"
```

Luego Next.js sobre esa misma carpeta. El flujo de `create-next-app` cambió
en Next 16, así que córrelo interactivo en vez de adivinar flags:

```bash
pnpm create next-app@latest .
```

Responde: TypeScript sí, App Router sí, Tailwind sí, ESLint sí, `src/` sí,
alias `@/*`. Turbopack ya viene por defecto.

Y Prisma:

```bash
pnpm add prisma @prisma/client
pnpm add -D tsx
pnpm dlx prisma init --datasource-provider postgresql
```

**Antes de la primera migración** necesitas la cadena de conexión de Neon:
crea el proyecto en la consola de Neon, región `us-east-1`, y copia la URL
con pooler al `.env`. Verifica que `.env` esté en `.gitignore`.

Estructura resultante:

```
multitenant/
├─ docs/plan.md
├─ prisma/schema.prisma
├─ proxy.ts
└─ src/
   ├─ app/[tenant]/
   ├─ lib/db/          ← único lugar donde vive el cliente Prisma
   └─ features/        ← registro de features y módulos
```

Desde acá, todo lo demás lo construye Claude Code siguiendo el Sprint 1.

---

## 7. Reglas de código no negociables

1. Nunca `if (tenant === 'x')`. Es una feature o un campo de configuración.
2. Nunca el cliente Prisma crudo fuera de `src/lib/db`. Siempre `forTenant`.
3. Todo módulo empieza sus server actions con `assertFeature` y `assertRole`.
4. Dinero en `BigInt` de pesos. Nunca `Float`.
5. Movimientos contables y de stock son append-only. Nunca `UPDATE`, siempre reversa.
6. Precio y stock cuelgan de la variante, nunca del producto.
7. Fotos suben directo del navegador a R2. Nunca pasan por la función serverless.
8. Todo índice de consulta empieza por `tenantId`.
9. `observaciones` y `notasInternas` jamás se mezclan.
10. El Dockerfile se mantiene al día desde el Sprint 1.

---

## 8. Riesgos y decisiones pendientes

| Riesgo | Mitigación |
|---|---|
| Neon Free se queda en 0,5 GB | Solo texto en la DB; migrar a Launch (~USD 5/mes) cuando se acerque |
| Resend tope 100 correos/día | Los magic links del portal comparten cuota con los recordatorios; monitorear desde el Sprint 9 |
| Vercel Hobby prohíbe uso comercial | Pasar a Pro con el primer taller pagando |
| Un taller pide algo muy fuera del modelo | Se convierte en módulo vendible a todos, no en caso especial |
| Alcance creciendo sin control | El orden de sprints es la defensa; nada se adelanta |

**Confirmado:** el logo del informe es el del taller emisor, junto con dirección, ciudad, teléfono, correo, Instagram y rubro. Todo eso vive en `TenantConfig` y se imprime en la cabecera del PDF.

## Estado actual

- Sprint en curso: 2 (por iniciar, a la espera de que se pida avanzar)
- Completados: Sprint 1
- Entorno: Next 16.3, Prisma 7.9.1, Node 22, Neon (production, us-east-1)
- Primer taller: TCcars — pendiente que empiecen a capturar
  correo y teléfono de sus clientes

### Sprint 1 — avance al 2026-08-06

**Hecho:**
- `prisma/schema.prisma`: modelos `Tenant`, `TenantConfig`, `TenantFeature`, `User`
- Migración aplicada a Neon (`prisma/migrations/20260806050148_sprint1_fundaciones`)
- `src/lib/db/`: `client.ts` (PrismaClient + adapter Neon), `tenant.ts`
  (`forTenant(tenantId)`), `lookup.ts` (`getTenantBySlug`), `admin.ts`
  (`seedTenant`), `index.ts` (barrel — único punto de importación permitido)
- `src/proxy.ts`: resuelve tenant por host y reescribe a `/[tenant]/...`
  — **ojo**: vive en `src/proxy.ts`, NO en la raíz, porque el proyecto usa
  carpeta `src/`. En la raíz Next lo ignora en silencio (no tira error).
- `src/features/registry.ts` (catálogo `FEATURES`) y
  `src/features/assertFeature.ts` (`assertFeature` para server actions,
  `assertFeatureOrNotFound` para layout/page)
- `src/app/[tenant]/layout.tsx` y `page.tsx`: placeholder mínimo, resuelven
  tenant y devuelven 404 si no existe
- Regla de ESLint (`eslint.config.mjs`) que prohíbe importar
  `@prisma/client` / `@prisma/adapter-neon` / `@/generated/prisma/*` fuera
  de `src/lib/db`
- `prisma/seed.ts`: talleres semilla `tccars` (ordenes, agenda,
  recordatorios, portal, contabilidad) y `demo` (ordenes, mostrario) —
  ya corrido contra Neon
- `Dockerfile` multi-stage + `output: "standalone"` en `next.config.ts`
- Verificado: `npx eslint .` limpio, `npm run build` sin errores (aparece
  `ƒ Proxy (Middleware)` en el resumen de rutas)

**Verificación en navegador — 2026-08-12:**
- `tccars.localhost:3000` y `demo.localhost:3000` muestran cada uno su
  propio taller
- Host desconocido (`noexiste.localhost:3000`) → "taller no encontrado"
- Ruta inexistente dentro de un tenant válido (`tccars.localhost:3000/algo-inventado`) → 404
- **No hizo falta tocar `/etc/hosts`**: macOS y los navegadores modernos
  resuelven `*.localhost` a `127.0.0.1` automáticamente (RFC 6761).
  Verificado con `ping tccars.localhost`. Ojo con esto en el futuro:
  no asumir que hace falta editar hosts sin comprobarlo primero.

**Sprint 1 cerrado.** Siguiente: Sprint 2, a la espera de que se pida
avanzar explícitamente.
