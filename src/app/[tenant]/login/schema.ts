import { z } from "zod";

// Única fuente de validación: la usa react-hook-form en el cliente. La
// verdad de si la contraseña es correcta la decide authorizeCredentials
// en el servidor (ver docs/aprendizaje/04-login-y-roles.md) — este schema
// solo evita mandar un POST con campos vacíos.
export const loginSchema = z.object({
  email: z.email("Correo inválido").trim(),
  password: z.string().min(1, "La contraseña es obligatoria."),
});

export type LoginInput = z.infer<typeof loginSchema>;
