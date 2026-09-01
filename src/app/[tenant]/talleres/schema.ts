import { z } from "zod";
import { PACKAGES, type PackageKey } from "@/features/packages";

const packageKeys = Object.keys(PACKAGES) as [PackageKey, ...PackageKey[]];

// Única fuente de validación: la usan react-hook-form en el cliente
// (feedback inmediato) y crearTallerAction en el servidor (nunca confiar
// solo en el cliente, ver CLAUDE.md). z.enum (no .refine) para que el tipo
// de entrada y salida coincidan y react-hook-form no se queje de tipos.
export const crearTallerSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "El slug es obligatorio.")
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones."),
  host: z.string().trim().min(1, "El host es obligatorio."),
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  paquete: z.enum(packageKeys, { message: "Elige un paquete válido." }),
  adminName: z.string().trim().min(1, "El nombre del admin es obligatorio."),
  adminEmail: z.email("Correo inválido").trim(),
  // Número desde donde sigue la numeración de OT/mantenciones de un taller
  // con historial previo (ver docs/plan.md sección Sprint 2). 1 = taller
  // nuevo, sin historial.
  correlativoInicial: z.coerce
    .number("Ingresa un número.")
    .int("Tiene que ser un número entero.")
    .min(1, "Tiene que ser 1 o más."),
});

// z.coerce.number vuelve "unknown" el tipo de entrada de ese campo (acepta
// cualquier cosa coercible, ej. el string que manda un <input type="number">).
// Por eso el form usa el tipo de entrada (antes de validar) y la server
// action el de salida (ya validado y convertido a number).
export type CrearTallerFormValues = z.input<typeof crearTallerSchema>;
export type CrearTallerInput = z.output<typeof crearTallerSchema>;
