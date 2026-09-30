"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type FormState = { ok?: true; error?: string };

const texto = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const numero = (fd: FormData, k: string) => {
  const v = texto(fd, k);
  return v ? Number(v) : null;
};

const ERROR_GENERICO = "No se pudo guardar. Probá de nuevo.";

export async function guardarCliente(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await requireUser())) return { error: "Sin sesión." };

  const id = numero(fd, "id");
  const nombre = texto(fd, "nombre");
  if (!nombre) return { error: "Poné el nombre del cliente." };
  const telefono = texto(fd, "telefono") || null;
  const notas = texto(fd, "notas") || null;

  const supabase = await createClient();

  if (id) {
    const { data, error } = await supabase.from("clientes").update({ nombre, telefono, notas }).eq("id", id).select("id");
    if (error) return { error: ERROR_GENERICO };
    if (!data?.length) return { error: "El cliente ya no existe." };
    revalidatePath("/clientes", "layout");
    return { ok: true };
  }

  const { data, error } = await supabase.from("clientes").insert({ nombre, telefono, notas }).select("id").single();
  if (error) return { error: ERROR_GENERICO };

  revalidatePath("/clientes", "layout");
  redirect(`/clientes/${data.id}`);
}
