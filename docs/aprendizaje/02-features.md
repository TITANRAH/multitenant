# 2. Sistema de features (`src/features/registry.ts` + `src/features/assertFeature.ts`)

> Archivos 4 de 8 del Sprint 1 (adelantados en la explicación porque `TenantFeature`, del `schema.prisma`, no se entiende sin ellos). Implementan la regla #1 de `CLAUDE.md`: "nunca `if (tenant === 'x')`. Toda diferencia entre talleres es una feature o un campo de configuración".

## La idea central: analogía con Netflix

Netflix tiene UNA sola app. No todas las cuentas ven lo mismo: tu cuenta puede tener 4K, la de tu amigo con plan básico no. Netflix no programó una app distinta por plan — programó una sola app que, antes de mostrar cada botón o pantalla, se pregunta *"¿esta cuenta tiene contratado el 4K?"*. Esa pregunta la responde consultando una tabla en su base de datos donde dice qué tiene contratada cada cuenta.

Trasladado a este proyecto:

| Netflix | Este proyecto |
|---|---|
| Una cuenta | Un taller (`Tenant`) |
| El plan 4K, el descargable | Una feature: `"agenda"`, `"whatsapp"`, etc. |
| Tabla de qué contrató cada cuenta | Tabla `TenantFeature` |
| "¿esta cuenta tiene 4K?" | `hasFeature(tallerId, "agenda")` |

**El código es siempre el mismo para todos los talleres.** Lo único que cambia entre un taller y otro es una fila en una tabla — nunca el nombre del taller escrito en el código fuente.

---

## Los dos lugares donde vive el sistema de features

El error más común al entender esto es pensar que "las features" viven en un solo lugar. Viven partidas en dos:

### Lugar 1 — el catálogo, vive en código: `registry.ts`

```ts
export const FEATURES = {
  ordenes: { label: "Órdenes de trabajo", requires: [] },
  agenda: { label: "Agendamiento", requires: ["ordenes"] },
  recordatorios: { label: "Recordatorios", requires: ["agenda"] },
  whatsapp: { label: "Recordatorios WhatsApp", requires: ["recordatorios"] },
  contabilidad: { label: "Contabilidad y dashboard", requires: ["ordenes"] },
  portal: { label: "Portal del cliente", requires: ["ordenes"] },
  mostrario: { label: "Mostrario de productos", requires: [] },
  videos: { label: "Galería y redes", requires: [] },
  chatbox: { label: "Asistente IA", requires: ["ordenes"] },
  tienda: { label: "Tienda online", requires: ["mostrario"] },
  pagos: { label: "Medios de pago", requires: ["tienda"] },
} as const satisfies Record<string, { label: string; requires: readonly string[] }>;

export type FeatureKey = keyof typeof FEATURES;

export function isFeatureKey(value: string): value is FeatureKey {
  return value in FEATURES;
}
```

Es el "menú impreso" del sistema: la lista fija de TODAS las features que el sistema sabe hacer, con su nombre legible (`label`) y de qué otras depende (`requires`). Es igual para todos los talleres, se sube al repo, no cambia por taller.

**Este archivo no decide "prendido o apagado" de nada.** Su único trabajo es darle a TypeScript un tipo (`FeatureKey`) con los 11 nombres válidos, para que si en cualquier parte del código escribís mal un nombre (`"agenad"` en vez de `"agenda"`), el error salte al escribir el código o al correr `npm run build` — **antes** de que llegue a producción.

`FEATURES.agenda.requires: ["ordenes"]` es información declarada, para el día que se valide en el alta de un taller que no se pueda prender `agenda` sin `ordenes`. En el Sprint 1 esa validación todavía no existe en el código — solo está declarada.

### Lugar 2 — el interruptor, vive en datos: tabla `TenantFeature`

```
tenantId    | featureKey     | enabled
------------|----------------|--------
tccars-id   | ordenes        | true
tccars-id   | agenda         | true
tccars-id   | recordatorios  | true
demo-id     | ordenes        | true
```

Es la "lista de qué tiene contratado cada cuenta". Vive en la base de datos, cambia por taller sin tocar código ni hacer deploy.

**Los tres estados posibles de una feature para un taller:**

| Estado | Cómo se representa |
|---|---|
| Nunca contratada | No existe la fila. No hace falta escribir nada. |
| Contratada y activa | Fila con `enabled: true` (sin `expiresAt`, o con `expiresAt` futuro) |
| Contratada pero dada de baja / vencida | Fila con `enabled: false` (se conserva, no se borra, para no perder el `config` guardado — ej. plantillas de WhatsApp ya armadas) |

En el ejemplo de arriba, `demo` solo tiene la fila de `ordenes`. Para `agenda`, `whatsapp`, etc. no tiene fila — y por eso, sin necesidad de que nadie escriba `enabled: false`, esas features ya cuentan como no contratadas.

---

## El código que conecta las dos mitades: `assertFeature.ts`

```ts
import { notFound } from "next/navigation";
import { forTenant } from "@/lib/db";
import type { FeatureKey } from "@/features/registry";

export async function hasFeature(tenantId: string, featureKey: FeatureKey): Promise<boolean> {
  const db = forTenant(tenantId);
  const row = await db.tenantFeature.findFirst({
    where: {
      featureKey,
      enabled: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  return row !== null;
}

export async function assertFeature(tenantId: string, featureKey: FeatureKey): Promise<void> {
  if (!(await hasFeature(tenantId, featureKey))) {
    throw new FeatureNotEnabledError(tenantId, featureKey);
  }
}

export async function assertFeatureOrNotFound(tenantId: string, featureKey: FeatureKey): Promise<void> {
  if (!(await hasFeature(tenantId, featureKey))) {
    notFound();
  }
}
```

- **`hasFeature`**: hace la pregunta real a la base de datos — "¿existe una fila para este taller y esta feature, activa y no vencida?". Devuelve `true`/`false`.
- **`assertFeature`**: el portero para **server actions** (crear un turno, guardar una orden). Si no tiene la feature, lanza un error interno que corta la operación.
- **`assertFeatureOrNotFound`**: el portero para **páginas**. Si no tiene la feature, devuelve un 404 — la página se comporta como si no existiera, sea que el usuario haya llegado por un link del menú o escribiendo la URL a mano.

---

## Trace paso a paso: empleado de `demo` visita `/demo/agenda`

`demo` no tiene fila para `"agenda"` en `TenantFeature`.

1. El navegador pide `GET /demo/agenda`.
2. La página del servidor arranca y su primera línea es `await assertFeatureOrNotFound(tallerId, "agenda")`.
   - Acá `registry.ts` ya cumplió su función: como el parámetro es de tipo `FeatureKey`, TypeScript garantizó, al compilar, que `"agenda"` es uno de los 11 nombres válidos. No se consulta en este paso, ya se validó antes de que el programa corriera.
3. `assertFeatureOrNotFound` llama a `hasFeature(tallerId, "agenda")`.
4. `hasFeature` consulta la tabla: `WHERE tenantId = 'demo-id' AND featureKey = 'agenda' AND enabled = true`.
5. Postgres no encuentra ninguna fila (nunca se creó) → devuelve `null`.
6. `hasFeature` devuelve `false`.
7. De vuelta en `assertFeatureOrNotFound`, la condición `!(false)` es `true` → se ejecuta `notFound()`.
8. Next.js corta la ejecución y le devuelve al navegador una página 404, como si la ruta no existiera.

**El mismo trace con `tccars`** (que sí tiene la fila con `enabled: true`): en el paso 5 Postgres encuentra la fila, `hasFeature` devuelve `true`, la condición del paso 7 es `false`, `notFound()` nunca se llama, y la página sigue ejecutándose normalmente después de esa línea.

---

## ¿Esto decide también qué se ve en pantalla, o solo bloquea el acceso?

Las dos cosas — es la misma pregunta (`hasFeature`), usada en dos lugares distintos:

**En el menú** (cosmético — ordena qué botones mostrar):
```tsx
{await hasFeature(tallerId, "agenda") && (
  <MenuItem href="/agenda">Agenda</MenuItem>
)}
```

**En la página misma** (el candado real, por si alguien escribe la URL a mano):
```tsx
await assertFeatureOrNotFound(tallerId, "agenda");
```

Hacen falta las dos: si solo escondieras el botón del menú, alguien podría escribir la URL directo en el navegador y entrar igual. El menú es la vidriera, `assertFeatureOrNotFound` es la puerta con llave.

---

## `isFeatureKey`: el guard para datos que vienen de afuera

```ts
export function isFeatureKey(value: string): value is FeatureKey {
  return value in FEATURES;
}
```

**Por qué hace falta esto si ya existe el tipo `FeatureKey`:** los tipos de TypeScript se borran cuando el código corre de verdad — solo existen mientras escribís en el editor y cuando compila. Si vos mismo escribís `"agenda"` a mano en el código, alcanza con tipar el parámetro como `FeatureKey`, porque TypeScript lo revisa en ese momento.

Pero si el nombre de la feature viene de afuera — por ejemplo de una URL dinámica tipo `/demo/panel/[feature]`, donde el texto lo escribe quien visita la página, no vos — ese valor llega como `string` genérico, no como `FeatureKey`, porque viene de un lugar que TypeScript no controla.

```ts
const feature = params.feature; // string, no confiable, viene de la URL

if (!isFeatureKey(feature)) {
  notFound(); // no es una feature real
}

// a partir de acá, TypeScript "sabe" que feature es FeatureKey
await assertFeatureOrNotFound(tallerId, feature);
```

`isFeatureKey` es el punto de conversión obligatorio: antes de la línea, es un `string` cualquiera del que no se sabe nada; después del `if`, TypeScript lo trata como garantizado uno de los 11 nombres válidos (por el `value is FeatureKey` en la firma). De paso, evita mandarle basura a la consulta de la base de datos — aunque eso no rompería nada (Postgres simplemente no encontraría fila y `hasFeature` devolvería `false`), el valor real es la garantía de tipo para el resto del código.

- `FeatureKey` (el tipo): protege errores tuyos, al escribir código.
- `isFeatureKey` (la función): protege datos que vienen de fuera de tu control, en el momento real en que la app está corriendo.

---

**Siguiente archivo:** `src/lib/db/` — el código que genera el `db` que usa `forTenant(tenantId)` en `hasFeature`, y por qué es el único lugar del proyecto donde se puede importar Prisma directamente (regla #2 de `CLAUDE.md`).
