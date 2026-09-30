"use client";

import { useActionState, useState } from "react";
import { btnPrimaryCls, Field, FormError, inputCls } from "@/components/form";
import { guardarEmpresa, subirLogo, type FormState } from "./actions";

export function EmpresaEditor({ nombre, colorMarca }: { nombre: string; colorMarca: string }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <DatosForm nombre={nombre} colorMarca={colorMarca} />
      <LogoForm />
    </div>
  );
}

function DatosForm({ nombre, colorMarca }: { nombre: string; colorMarca: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(guardarEmpresa, {});
  const [color, setColor] = useState(colorMarca.toUpperCase());

  return (
    <form action={action} className="flex flex-1 flex-col gap-4">
      <Field label="Nombre del negocio" htmlFor="empresa-nombre">
        <input id="empresa-nombre" name="nombre" required defaultValue={nombre} className={inputCls} />
      </Field>

      <Field label="Color de marca" htmlFor="empresa-color" hint="Se usa en botones, links activos y el acento del menú.">
        <div className="flex items-center gap-3">
          <label
            className="relative size-11 flex-none cursor-pointer rounded-[10px] border border-line"
            style={{ backgroundColor: color }}
          >
            <span className="sr-only">Elegir color</span>
            <input
              id="empresa-color"
              type="color"
              value={color.toLowerCase()}
              onChange={(e) => setColor(e.target.value.toUpperCase())}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
          </label>
          <input type="hidden" name="color_marca" value={color} />
          <span className="tabular-nums text-muted">{color}</span>
        </div>
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
