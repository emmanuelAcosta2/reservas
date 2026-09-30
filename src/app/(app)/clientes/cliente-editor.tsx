"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/components/modal";
import { btnPrimaryCls, btnSmCls, Field, FormError, inputCls } from "@/components/form";
import { guardarCliente, type FormState } from "./actions";

export type ClienteDatos = { id: number; nombre: string; telefono: string | null; notas: string | null };

const nuevoCls = "inline-flex min-h-9 items-center justify-center rounded-[10px] border border-brand bg-brand px-3 text-sm font-semibold text-brand-ink";

export function ClienteEditor({ cliente }: { cliente?: ClienteDatos }) {
  return (
    <Modal
      title={cliente ? "Editar cliente" : "Nuevo cliente"}
      trigger={cliente ? "Editar" : "+ Cliente"}
      triggerClassName={cliente ? btnSmCls : nuevoCls}
    >
      {(close) => <ClienteForm cliente={cliente} close={close} />}
    </Modal>
  );
}

function ClienteForm({ cliente, close }: { cliente?: ClienteDatos; close: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(guardarCliente, {});
  useEffect(() => {
    if (state.ok) close();
  }, [state, close]);

  return (
    <form action={action} className="flex flex-col gap-4">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}
      <Field label="Nombre" htmlFor="cli-nombre">
        <input id="cli-nombre" name="nombre" required autoComplete="off" defaultValue={cliente?.nombre} placeholder="Nombre y apellido" className={inputCls} />
      </Field>
      <Field label="Teléfono" htmlFor="cli-tel" hint="Queda guardado para poder enviar recordatorios más adelante.">
        <input id="cli-tel" name="telefono" type="tel" inputMode="tel" defaultValue={cliente?.telefono ?? ""} placeholder="099 000 000" className={inputCls} />
      </Field>
      <Field label="Notas" htmlFor="cli-notas">
        <textarea id="cli-notas" name="notas" rows={2} defaultValue={cliente?.notas ?? ""} className={`${inputCls} min-h-16`} />
      </Field>

      <FormError message={state.error} />
      <button disabled={pending} className={btnPrimaryCls}>
        {pending ? "Guardando…" : cliente ? "Guardar" : "Crear cliente"}
      </button>
    </form>
  );
}
