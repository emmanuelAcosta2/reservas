"use client";

import { useMemo, useState, useTransition } from "react";
import { btnSmCls, FormError, inputCls } from "@/components/form";
import { altaRapidaCliente } from "./actions";
import { useCatalogo } from "./catalogo";

const sinTildes = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const MAX_RESULTADOS = 6;

type Cliente = { id: number; nombre: string; telefono: string | null };

/** Elige el cliente del turno: búsqueda por nombre o teléfono, y alta rápida de cliente nuevo. */
export function SelectorCliente({ valor, onChange }: { valor: number; onChange: (id: number) => void }) {
  const cat = useCatalogo();
  const [agregados, setAgregados] = useState<Cliente[]>([]);
  const [modo, setModo] = useState<"elegido" | "buscando" | "alta">(valor ? "elegido" : "buscando");
  const [q, setQ] = useState("");

  const clientes: Cliente[] = useMemo(() => [...cat.clientes, ...agregados], [cat.clientes, agregados]);
  const elegido = clientes.find((c) => c.id === valor);

  const resultados = useMemo(() => {
    const t = sinTildes(q).trim();
    if (!t) return clientes;
    return clientes.filter((c) => sinTildes(c.nombre).includes(t) || (c.telefono ?? "").includes(t));
  }, [q, clientes]);

  const elegir = (id: number) => {
    onChange(id);
    setModo("elegido");
    setQ("");
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">Cliente</span>

      {modo === "elegido" && elegido && (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-raised px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-none font-bold tracking-wide">{elegido.nombre}</p>
            <p className="mt-1 truncate text-[13px] text-muted">{elegido.telefono || "Sin teléfono"}</p>
          </div>
          <button type="button" onClick={() => setModo("buscando")} className={btnSmCls}>
            Cambiar
          </button>
        </div>
      )}

      {modo === "buscando" && (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-raised p-2.5">
          <input
            type="search"
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o teléfono"
            aria-label="Buscar cliente"
            autoComplete="off"
            className={inputCls}
          />
          <ul className="flex flex-col gap-1" role="listbox" aria-label="Clientes">
            {resultados.slice(0, MAX_RESULTADOS).map((c) => (
              <li key={c.id} role="option" aria-selected={c.id === valor}>
                <button
                  type="button"
                  onClick={() => elegir(c.id)}
                  className="flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left hover:bg-surface aria-selected:bg-surface"
                >
                  <b className="min-w-0 flex-1 truncate">{c.nombre}</b>
                  <span className="text-[13px] text-muted tabular-nums">{c.telefono || "Sin teléfono"}</span>
                </button>
              </li>
            ))}
            {resultados.length === 0 && <li className="px-2.5 py-2 text-sm text-muted">No hay clientes que coincidan.</li>}
            {resultados.length > MAX_RESULTADOS && (
              <li className="px-2.5 py-1 text-[12px] text-muted">Hay {resultados.length - MAX_RESULTADOS} más. Seguí escribiendo para acotar.</li>
            )}
          </ul>
          <div className="flex gap-2">
            <button type="button" onClick={() => setModo("alta")} className={`${btnSmCls} flex-1`}>
              + Cliente nuevo
            </button>
            {elegido && (
              <button type="button" onClick={() => setModo("elegido")} className={btnSmCls}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {modo === "alta" && (
        <AltaRapida
          volver={() => setModo(elegido ? "elegido" : "buscando")}
          creado={(c) => {
            setAgregados((p) => [...p, c]);
            elegir(c.id);
          }}
        />
      )}
    </div>
  );
}

function AltaRapida({ volver, creado }: { volver: () => void; creado: (c: Cliente) => void }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState<string>();
  const [pendiente, empezar] = useTransition();

  const guardar = () =>
    empezar(async () => {
      const r = await altaRapidaCliente({ nombre, telefono });
      if (r.error) setError(r.error);
      else if (r.cliente) creado(r.cliente);
    });

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-raised p-3">
      <b>Cliente nuevo</b>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="alta-cliente" className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
          Nombre
        </label>
        <input
          id="alta-cliente"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoComplete="off"
          placeholder="Nombre y apellido"
          className={inputCls}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="alta-tel" className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
          Teléfono
        </label>
        <input id="alta-tel" type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="099 000 000" className={inputCls} />
      </div>

      <FormError message={error} />
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={volver} className={`${btnSmCls} min-h-11`}>
          Volver
        </button>
        <button
          type="button"
          disabled={pendiente || !nombre.trim()}
          onClick={guardar}
          className="inline-flex min-h-11 items-center justify-center rounded-[10px] border border-brand bg-brand px-3 text-sm font-semibold text-brand-ink disabled:opacity-60"
        >
          {pendiente ? "Guardando…" : "Crear y usar"}
        </button>
      </div>
    </div>
  );
}
