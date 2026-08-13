# 1. `prisma/schema.prisma`

> Archivo 1 de 8 del Sprint 1. Orden: `schema.prisma` → `src/lib/db/` → `proxy.ts` → `src/features/registry.ts` → `src/app/[tenant]/` → regla ESLint → seed → `Dockerfile`.

## ¿Qué es este archivo?

No es código que "corre" cuando alguien visita la web. Es una **descripción de las tablas de la base de datos**, escrita en el lenguaje propio de Prisma (no es JavaScript ni SQL). Prisma lee este archivo y genera dos cosas:

1. Las tablas reales en Postgres (Neon), cuando corrés `npx prisma migrate dev`.
2. Un cliente de TypeScript para consultar esas tablas desde el código, cuando corrés `npx prisma generate`.

Es el primer archivo del sprint porque todo lo demás (`src/lib/db/`, las server actions, etc.) depende de que estas tablas existan y de que el cliente generado exista.

---

## Configuración inicial

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

Instrucción para la herramienta Prisma (no para la base de datos): "generá el código de TypeScript que voy a importar en mi app, y guardalo en `src/generated/prisma`". Ese código generado es lo que después se usa así:

```ts
// esto NO existe todavía como archivo real del proyecto,
// es un ejemplo de cómo se importaría el cliente generado
import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();
const talleres = await prisma.tenant.findMany();
```

```prisma
datasource db {
  provider = "postgresql"
}
```

Le dice a Prisma qué tipo de base de datos es (Postgres). La dirección real (usuario, contraseña, servidor de Neon) **no está acá** — vive en `.env` como `DATABASE_URL`, para que nunca se suba al repo.

---

## Modelo `Tenant` (un taller mecánico)

```prisma
model Tenant {
  id     String @id @default(cuid())
  slug   String @unique
  host   String @unique

  nombre String

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  config   TenantConfig?
  features TenantFeature[]
  users    User[]

  @@map("tenants")
}
```

| Línea | Qué significa |
|---|---|
| `model Tenant` | Crea una tabla. En la base real se llama `tenants` (ver `@@map` al final) — la convención es `PascalCase` en el código, `snake_case`/plural en SQL. |
| `id String @id @default(cuid())` | Columna `id`, texto. `@id` = clave primaria. `@default(cuid())` = si no le pasás valor, Prisma genera un código único random (ej. `"clx8f2a9b0001..."`) en vez de 1, 2, 3... — así los IDs no son adivinables. |
| `slug String @unique` / `host String @unique` | `@unique` = la base de datos **rechaza** una fila nueva si el valor ya existe en otra fila. Dos talleres no pueden compartir `slug` ni `host`. |
| `nombre String` | Columna de texto simple, sin restricciones. |
| `createdAt DateTime @default(now())` | Se llena sola con la fecha/hora actual al crear la fila. |
| `updatedAt DateTime @updatedAt` | Prisma la actualiza **sola** cada vez que la fila cambia. No la seteás vos a mano en el código. |
| `config TenantConfig?` / `features TenantFeature[]` / `users User[]` | **No son columnas reales.** Son relaciones: le dicen a Prisma cómo conectar esta tabla con las otras tres. El `?` = relación opcional (puede no existir aún), el `[]` = relación de "muchos". Gracias a esto podés escribir `tenant.users` en código y Prisma trae los usuarios de ese taller sin que escribas un `JOIN` de SQL a mano. |
| `@@map("tenants")` | Mapeo de nombre: en código es `Tenant`, en la tabla real es `tenants`. Puramente cosmético. |

### Ejemplo de uso (una vez generado el cliente)

```ts
// buscar un taller por su host, tal como lo va a hacer proxy.ts
const taller = await prisma.tenant.findUnique({
  where: { host: "tccars.localhost" },
});

// taller.id, taller.slug, taller.nombre están disponibles y tipados
```

---

## Modelo `TenantConfig` (identidad visual y contacto)

```prisma
model TenantConfig {
  tenantId String @id
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  logoUrl         String?
  colorPrimario   String?
  colorSecundario String?
  tipografia      String?

  direccion String?
  ciudad    String?
  telefono  String?
  correo    String?
  instagram String?
  rubro     String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("tenant_configs")
}
```

- `tenantId String @id` — a diferencia de `Tenant`, acá la clave primaria **no es un cuid propio**, es directamente el `id` del taller al que pertenece. Esto fuerza que exista como máximo un `TenantConfig` por taller (relación 1 a 1).
- `tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)` — esta es la relación real (a diferencia de `config TenantConfig?` en `Tenant`, que era solo la vista "de ida"). `@relation` define la conexión de verdad: la columna `tenantId` de esta tabla apunta a la columna `id` de `Tenant`. `onDelete: Cascade` = si se borra el `Tenant`, Postgres borra automáticamente su `TenantConfig` (evita configs huérfanas).
- Todos los campos tienen `?` (String opcional) porque un taller recién creado puede no tener logo, colores, etc. todavía — se completan en el Sprint 10.

### Ejemplo de uso

```ts
const config = await prisma.tenantConfig.findUnique({
  where: { tenantId: taller.id },
});

// config?.colorPrimario -- puede ser null si no se configuró aún
```

---

## Modelo `TenantFeature` (qué funcionalidades tiene prendidas cada taller)

```prisma
model TenantFeature {
  tenantId   String
  featureKey String

  enabled   Boolean   @default(true)
  config    Json?
  expiresAt DateTime?

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@id([tenantId, featureKey])
  @@map("tenant_features")
}
```

- `@@id([tenantId, featureKey])` — clave primaria **compuesta** (combinación de dos columnas, en vez de un `id` propio). Significa: "no puede haber dos filas con el mismo par (`tenantId`, `featureKey`)" — un taller no puede tener la misma feature registrada dos veces.
- `featureKey String` — el nombre de la feature, ej. `"recordatorios-email"`. El catálogo de qué features existen y qué hacen vive en código (`src/features/registry.ts`, el archivo 4 del sprint) — esta tabla solo dice **prendido/apagado** y guarda configuración extra.
- `enabled Boolean @default(true)` — si la feature está activa para ese taller.
- `config Json?` — configuración libre por feature (ej. cuántos recordatorios por día), sin necesidad de crear una columna nueva por cada parámetro posible.
- `expiresAt DateTime?` — para features de prueba con vencimiento (ej. trial de 30 días).

Esta tabla es la implementación concreta de la regla #1 de `CLAUDE.md`: en vez de escribir `if (tenant.slug === "tccars")` en el código, se pregunta "¿este taller tiene la feature `X` prendida?" consultando esta tabla.

### Ejemplo de uso

```ts
const featureActiva = await prisma.tenantFeature.findUnique({
  where: {
    tenantId_featureKey: { tenantId: taller.id, featureKey: "recordatorios-email" },
  },
});

if (!featureActiva?.enabled) {
  // el taller no tiene esta feature -> 404, según CLAUDE.md
}
```

(`tenantId_featureKey` es el nombre que Prisma genera automáticamente para buscar por una clave compuesta — junta los dos nombres de columna con `_`.)

---

## Modelo `User` (empleados del taller)

```prisma
model User {
  id       String @id @default(cuid())
  tenantId String

  email String
  name  String

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([tenantId, email])
  @@index([tenantId])
  @@map("users")
}
```

- `@@unique([tenantId, email])` — a diferencia de `@unique` en una sola columna, esto es sobre la **combinación** de dos: el mismo email puede repetirse en talleres distintos (dos talleres distintos pueden tener cada uno un usuario `admin@gmail.com`), pero no dos veces dentro del mismo taller.
- `@@index([tenantId])` — le dice a Postgres "creá un índice para buscar rápido por `tenantId`". Sin esto, cada consulta que filtra por taller (que es *todas*, en un sistema multi-tenant) tendría que revisar la tabla entera fila por fila. Esta línea es la aplicación literal de la regla #8 de `CLAUDE.md`: "todo índice de consulta empieza por `tenantId`".

### Ejemplo de uso

```ts
const empleados = await prisma.user.findMany({
  where: { tenantId: taller.id },
});
// gracias al @@index([tenantId]), esta consulta es rápida
// aunque la tabla users tenga usuarios de miles de talleres
```

---

## La idea que conecta todo el archivo

Excepto `Tenant` (que *es* el taller), las otras tres tablas tienen `tenantId` como parte de su identidad — es lo que permite que **una sola base de datos** sirva a todos los talleres sin que uno vea los datos de otro. Cada consulta en el código real (que vamos a ver en `src/lib/db/`) va a filtrar siempre por `tenantId`, nunca va a haber una consulta "sin taller".

---

**Siguiente archivo:** `src/lib/db/` — el código que usa este esquema para hablarle a la base de datos de forma segura (la función `forTenant(tenantId)` mencionada en `CLAUDE.md`).
