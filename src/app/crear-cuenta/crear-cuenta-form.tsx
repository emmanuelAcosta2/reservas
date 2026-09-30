"use client";

import { useActionState } from "react";
import { signUp, type CrearCuentaState } from "./actions";

const initial: CrearCuentaState = {};
const label = "text-[11px] font-semibold tracking-[0.12em] text-muted uppercase";
const input = "min-h-11 w-full rounded-[10px] border border-line bg-raised px-3 py-2.5 text-fg";

export function CrearCuentaForm({ organizacionId }: { organizacionId?: string }) {
  const [state, action, pending] = useActionState(signUp, initial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="organizacion_id" value={organizacionId ?? ""} />

      {!organizacionId && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nombre_empresa" className={label}>Nombre del negocio</label>
          <input id="nombre_empresa" name="nombre_empresa" required autoComplete="organization" className={input} />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={label}>Correo</label>
        <input id="email" name="email" type="email" autoComplete="email" required className={input} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={label}>Contraseña</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={6} required className={input} />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-bad">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="min-h-11 rounded-[10px] bg-brand px-4 font-semibold text-brand-ink disabled:opacity-60"
      >
        {pending ? "Creando…" : "Crear cuenta"}
      </button>
    </form>
  );
}
