"use client";

import { useActionState, useState } from "react";
import { btnPrimaryCls, Field, FormError, inputCls } from "@/components/form";
import { guardarEmpresa, subirLogo, type FormState } from "./actions";

export function EmpresaEditor({ nombre }: { nombre: string }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <DatosForm nombre={nombre} />
      <LogoForm />
    </div>
  );
}

function DatosForm({ nombre }: { nombre: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(guardarEmpresa, {});

  return (
    <form action={action} className="flex flex-1 flex-col gap-4">
      <Field label="Nombre del negocio" htmlFor="empresa-nombre">
        <input id="empresa-nombre" name="nombre" required defaultValue={nombre} className={inputCls} />
      </Field>

      <FormError message={state.error} />
      <button disabled={pending} className={`${btnPrimaryCls} self-start`}>
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}

function LogoForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(subirLogo, {});
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);

  return (
    <form action={action} className="flex flex-1 flex-col gap-4">
      <Field label="Logo" htmlFor="empresa-logo" hint="PNG, JPG, WebP o SVG. Hasta 2 MB.">
        <label
          htmlFor="empresa-logo"
          className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-[10px] border border-dashed border-line bg-raised px-3 py-2.5"
        >
          <span className="truncate text-muted">{nombreArchivo ?? "Elegí un archivo…"}</span>
          <span className="flex-none text-[13px] font-semibold text-brand">Elegir</span>
        </label>
        <input
          id="empresa-logo"
          name="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          required
          onChange={(e) => setNombreArchivo(e.target.files?.[0]?.name ?? null)}
          className="sr-only"
        />
      </Field>

      <FormError message={state.error} />
      <button disabled={pending} className={`${btnPrimaryCls} self-start`}>
        {pending ? "Subiendo…" : "Subir logo"}
      </button>
    </form>
  );
}
