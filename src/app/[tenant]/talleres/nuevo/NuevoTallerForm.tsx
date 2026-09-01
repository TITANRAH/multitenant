"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { crearTallerAction } from "@/app/[tenant]/talleres/actions";
import {
  crearTallerSchema,
  type CrearTallerFormValues,
  type CrearTallerInput,
} from "@/app/[tenant]/talleres/schema";
import { PACKAGES } from "@/features/packages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function NuevoTallerForm() {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CrearTallerFormValues, unknown, CrearTallerInput>({
    resolver: zodResolver(crearTallerSchema),
    defaultValues: { paquete: "basico", correlativoInicial: 1 },
  });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = await crearTallerAction(data);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="w-full max-w-lg space-y-4">
      <FieldGroup>
        <Field data-invalid={!!errors.slug}>
          <FieldLabel htmlFor="slug">Slug</FieldLabel>
          <Input id="slug" placeholder="tccars" aria-invalid={!!errors.slug} {...register("slug")} />
          <FieldDescription>
            Identificador corto y único del taller (sin espacios).
          </FieldDescription>
          <FieldError errors={[errors.slug]} />
        </Field>

        <Field data-invalid={!!errors.host}>
          <FieldLabel htmlFor="host">Host</FieldLabel>
          <Input
            id="host"
            placeholder="tccars.localhost:3000"
            aria-invalid={!!errors.host}
            {...register("host")}
          />
          <FieldDescription>
            Dominio o subdominio que resuelve a este taller (ver proxy.ts).
          </FieldDescription>
          <FieldError errors={[errors.host]} />
        </Field>

        <Field data-invalid={!!errors.nombre}>
          <FieldLabel htmlFor="nombre">Nombre</FieldLabel>
          <Input
            id="nombre"
            placeholder="TCcars"
            aria-invalid={!!errors.nombre}
            {...register("nombre")}
          />
          <FieldError errors={[errors.nombre]} />
        </Field>

        <Field data-invalid={!!errors.paquete}>
          <FieldLabel htmlFor="paquete">Paquete</FieldLabel>
          <Controller
            control={control}
            name="paquete"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="paquete" aria-invalid={!!errors.paquete}>
                  <SelectValue placeholder="Elige un paquete" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PACKAGES).map(([key, pkg]) => (
                    <SelectItem key={key} value={key}>
                      {pkg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.paquete]} />
        </Field>

        <Field data-invalid={!!errors.correlativoInicial}>
          <FieldLabel htmlFor="correlativoInicial">Correlativo inicial de mantenciones</FieldLabel>
          <Input
            id="correlativoInicial"
            type="number"
            min={1}
            step={1}
            aria-invalid={!!errors.correlativoInicial}
            {...register("correlativoInicial")}
          />
          <FieldDescription>
            Número desde donde sigue la numeración de OT. Dejalo en 1 si el taller es nuevo.
          </FieldDescription>
          <FieldError errors={[errors.correlativoInicial]} />
        </Field>

        <FieldSet className="rounded-lg border p-4">
          <FieldLegend variant="label">Admin del taller (primer OWNER)</FieldLegend>
          <FieldGroup>
            <Field data-invalid={!!errors.adminName}>
              <FieldLabel htmlFor="adminName">Nombre</FieldLabel>
              <Input
                id="adminName"
                placeholder="Ana Pérez"
                aria-invalid={!!errors.adminName}
                {...register("adminName")}
              />
              <FieldError errors={[errors.adminName]} />
            </Field>

            <Field data-invalid={!!errors.adminEmail}>
              <FieldLabel htmlFor="adminEmail">Correo</FieldLabel>
              <Input
                id="adminEmail"
                type="email"
                placeholder="ana@tccars.cl"
                aria-invalid={!!errors.adminEmail}
                {...register("adminEmail")}
              />
              <FieldError errors={[errors.adminEmail]} />
            </Field>
          </FieldGroup>
        </FieldSet>

        {serverError ? <FieldError>{serverError}</FieldError> : null}

        <Field orientation="horizontal">
          <Button type="submit" disabled={pending}>
            {pending ? "Creando..." : "Crear taller"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
