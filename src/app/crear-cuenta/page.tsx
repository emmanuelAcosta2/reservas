import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { ALTA_ABIERTA } from "@/lib/alta";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CrearCuentaForm } from "./crear-cuenta-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function CrearCuentaPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const { org } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <Brand />
      <div className="flag" aria-hidden="true" />
      {!isSupabaseConfigured ? (
        <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
          Falta configurar Supabase. Copiá <code>.env.example</code> a <code>.env.local</code> y completá las dos
          variables.
        </p>
      ) : !ALTA_ABIERTA ? (
        <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
          Por ahora las cuentas se habilitan a mano. Si ya hablaste con nosotros, esperá el alta o el link de
          invitación de tu equipo.
        </p>
      ) : (
        <>
          {org && (
            <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
              Te vas a sumar al equipo que te invitó, con tu propia cuenta.
            </p>
          )}
          <CrearCuentaForm organizacionId={org} />
        </>
      )}
      <p className="text-center text-[13px] text-muted">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-semibold text-fg underline-offset-4 hover:underline">
          Ingresá
        </Link>
      </p>
    </main>
  );
}
