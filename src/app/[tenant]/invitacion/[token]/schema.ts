import { z } from "zod";

// Única fuente de validación: la usa react-hook-form en el cliente.
// acceptInvitation en el servidor vuelve a validar el token (link roto,
// vencido, ya usado) — este schema solo valida la contraseña elegida.
export const aceptarInvitacionSchema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type AceptarInvitacionInput = z.infer<typeof aceptarInvitacionSchema>;
