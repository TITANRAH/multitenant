// Catálogo de features del sistema. Vive en código: se versiona y se testea.
// La activación por taller vive en datos (tabla TenantFeature).
// Ver docs/plan.md sección 2.

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
