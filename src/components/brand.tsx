import Image from "next/image";
import { getOrganizacion, type Organizacion } from "@/lib/data/organizacion";
import { tintaSobre } from "@/lib/color";
import { iniciales } from "@/lib/dominio";

function Logo({ org, big }: { org: Organizacion; big?: boolean }) {
  const clase = `size-10 flex-none rounded-full border-2 border-surface object-cover ${big ? "lg:size-[46px]" : ""}`;

  if (org.logoUrl) {
    return <Image src={org.logoUrl} alt={org.nombre} width={46} height={46} className={clase} />;
  }
  return (
    <div
      className={`${clase} flex items-center justify-center bg-brand font-display text-sm font-bold`}
      style={{ color: tintaSobre(org.colorMarca) }}
    >
      {iniciales(org.nombre)}
    </div>
  );
}

const wordmark = (org: Organizacion, size: string) => (
  <div className={`font-display ${size} leading-none font-bold tracking-wide uppercase`}>
    {org.nombre}
    <small className="mt-1 block font-sans text-[11px] leading-tight font-semibold tracking-[0.1em] whitespace-nowrap text-muted not-italic">
      Turnos y agenda
    </small>
  </div>
);

/**
 * `stacked` apila el logo arriba y el nombre abajo, a todo el ancho disponible: lo usa el menú
 * lateral, donde una fila horizontal puede no dejarle lugar al nombre en una sola línea.
 */
export async function Brand({ stacked }: { stacked?: boolean }) {
  const org = await getOrganizacion();

  if (stacked) {
    return (
      <div className="flex flex-col gap-3">
        <Logo org={org} big />
        {wordmark(org, "text-2xl")}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <Logo org={org} />
      {wordmark(org, "text-2xl")}
    </div>
  );
}
