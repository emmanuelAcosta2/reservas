import "server-only";
import { headers } from "next/headers";
import { ALTA_ABIERTA } from "@/lib/alta";
import { createClient } from "@/lib/supabase/server";
import { Copiar } from "../clientes/copiar";

export async function Equipo({ organizacionId }: { organizacionId: string }) {
  const supabase = await createClient();
  const { data: miembros } = await supabase.rpc("miembros_equipo");

  const h = await headers();
  const origen = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const linkInvitacion = `${origen}/crear-cuenta?org=${organizacionId}`;

  return (
    <section className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-4">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Equipo</p>

      <ul className="flex flex-col gap-2">
        {(miembros ?? []).map((m) => (
          <li key={m.email} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-raised px-3.5 py-3">
            <span className="min-w-0 truncate font-semibold">{m.email}</span>
          </li>
        ))}
      </ul>

      {ALTA_ABIERTA ? (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-line p-3.5">
          <p className="text-[13px] text-muted">
            Compartí este link para que alguien más se sume a esta organización con una cuenta nueva:
          </p>
          <div className="flex items-center gap-2">
            <input readOnly value={linkInvitacion} onFocus={(e) => e.currentTarget.select()} className="min-h-9 w-full truncate rounded-[10px] border border-line bg-raised px-3 text-[13px] text-muted" />
            <Copiar texto={linkInvitacion} />
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-line p-3.5 text-[13px] text-muted">
          El link para sumar gente por cuenta propia está pausado por ahora. Pedinos que demos de alta al nuevo
          miembro a mano.
        </p>
      )}
    </section>
  );
}
