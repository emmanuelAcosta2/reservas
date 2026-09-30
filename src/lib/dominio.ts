export const MEDIOS_PAGO = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  debito: "Débito",
  credito: "Crédito",
} as const;

export const ESTADOS = { agendado: "Agendado", realizado: "Realizado", cancelado: "Cancelado" } as const;
export type Estado = keyof typeof ESTADOS;

const TZ = "America/Montevideo";

const fechaCorta = new Intl.DateTimeFormat("es-UY", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
const hora = new Intl.DateTimeFormat("es-UY", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const fechaDia = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });

/** "vie, 26 sept · 14:30", siempre en horario de Montevideo. */
export function formatFechaHora(iso: string) {
  const d = new Date(iso);
  return `${fechaCorta.format(d)} · ${hora.format(d)}`;
}

/** "2026-09-26" en horario de Montevideo. */
export const diaLocal = (iso: string) => fechaDia.format(new Date(iso));

export const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
