import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <Brand />
      <div className="flag" aria-hidden="true" />
      {isSupabaseConfigured ? (
        <>
          <LoginForm />
          <p className="text-center text-[13px] text-muted">
            ¿Primera vez?{" "}
            <Link href="/crear-cuenta" className="font-semibold text-fg underline-offset-4 hover:underline">
              Creá tu cuenta
            </Link>
          </p>
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
          Falta configurar Supabase. Copiá <code>.env.example</code> a <code>.env.local</code> y completá las dos
          variables.
        </p>
      )}
    </main>
  );
}
