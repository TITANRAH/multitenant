"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { aceptarInvitacionAction } from "@/app/[tenant]/invitacion/[token]/actions";
import {
  aceptarInvitacionSchema,
  type AceptarInvitacionInput,
} from "@/app/[tenant]/invitacion/[token]/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";

export function AceptarInvitacionForm({ tenantId, token }: { tenantId: string; token: string }) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AceptarInvitacionInput>({ resolver: zodResolver(aceptarInvitacionSchema) });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = await aceptarInvitacionAction(tenantId, token, data);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Contraseña</FieldLabel>
          <Input
            id="password"
            type="password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>

        <Field data-invalid={!!errors.confirmPassword}>
          <FieldLabel htmlFor="confirmPassword">Repetir contraseña</FieldLabel>
          <Input
            id="confirmPassword"
            type="password"
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          <FieldError errors={[errors.confirmPassword]} />
        </Field>

        {serverError ? <FieldError>{serverError}</FieldError> : null}

        <Field orientation="horizontal">
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando..." : "Activar cuenta"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
