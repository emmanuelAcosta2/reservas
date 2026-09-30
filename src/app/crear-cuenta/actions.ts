"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CrearCuentaState = { error?: string };

export async function signUp(_prev: CrearCuentaState, formData: FormData): Promise<CrearCuentaState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nombreEmpresa = String(formData.get("nombre_empresa") ?? "").trim();
  const organizacionId = String(formData.get("organizacion_id") ?? "").trim();

  if (!email || !password) return { error: "Ingresá el correo y la contraseña." };
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };
  if (!organizacionId && !nombreEmpresa) return { error: "Ingresá el nombre de tu negocio." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre_empresa: nombreEmpresa, organizacion_id: organizacionId } },
  });

  if (error) {
    return { error: error.code === "user_already_exists" ? "Ese correo ya tiene una cuenta." : "No se pudo crear la cuenta. Probá de nuevo." };
  }

  redirect("/agenda");
}
