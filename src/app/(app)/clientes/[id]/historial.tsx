"use client";

import { useState } from "react";
import { EstadoPill } from "@/components/estado-pill";
import { btnSmCls } from "@/components/form";

export type TurnoHistorial = {
  id: number;
  fecha: string;
  estado: string;
  total: string;
  items: { nombre: string; colores: string[] }[];
};

const PAGINA = 6;

/** Historial del cliente: muestra de a 6 turnos para no alargar la página. */
export function Historial({ turnos }: { turnos: TurnoHistorial[] }) {
  const [visibles, setVisibles] = useState(PAGINA);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg leading-none font-bold tracking-wide uppercase">
          Historial <span className="font-sans text-[13px] font-normal tracking-normal text-muted normal-case tabular-nums">{turnos.length} turnos</span>
        </h2>
      </div>

      {turnos.length ? (
        <>
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
            {turnos.slice(0, visibles).map((t) => (
              <article
                key={t.id}
                className={`flex items-start gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 ${t.estado === "cancelado" ? "opacity-55" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-muted">{t.fecha}</p>
                  <ul className="mt-1 flex flex-col gap-0.5 text-sm">
                    {t.items.map((i, n) => (
                      <li key={n} className="flex items-center gap-2">
                        <span className="flex flex-none gap-0.5">
                          {i.colores.map((c, k) => (
                            <span key={k} className="size-[9px] rounded-full" style={{ backgroundColor: c }} />
                          ))}
                        </span>
                        {i.nombre}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`font-display text-lg leading-none font-bold tabular-nums ${t.estado === "cancelado" ? "line-through" : ""}`}>{t.total}</span>
                  <EstadoPill estado={t.estado} />
                </div>
              </article>
            ))}
          </div>
          {turnos.length > visibles && (
            <button type="button" onClick={() => setVisibles((v) => v + 10)} className={`${btnSmCls} min-h-11 w-full lg:w-auto lg:self-start`}>
              Ver más ({turnos.length - visibles} restantes)
            </button>
          )}
          {visibles > PAGINA && turnos.length <= visibles && (
            <button type="button" onClick={() => setVisibles(PAGINA)} className={`${btnSmCls} min-h-11 w-full lg:w-auto lg:self-start`}>
              Ver menos
            </button>
          )}
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">Sin historial todavía.</p>
      )}
    </section>
  );
}
