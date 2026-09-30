import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type Organizacion = { id: string; nombre: string; logoUrl: string | null; colorMarca: string };

const DEFAULT: Organizacion = { id: "", nombre: "Reservas", logoUrl: null, colorMarca: "#f28c1b" };

/** Organización del usuario de la sesión actual, o el branding por defecto sin sesión/Supabase. */
export async function getOrganizacion(): Promise<Organizacion> {
  if (!isSupabaseConfigured) return DEFAULT;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return DEFAULT;

  const { data } = await supabase.from("organizaciones").select("id, nombre, logo_url, color_marca").single();
  if (!data) return DEFAULT;
  return { id: data.id, nombre: data.nombre, logoUrl: data.logo_url, colorMarca: data.color_marca };
}
