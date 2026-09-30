/** Tinta (texto) legible sobre un color de marca: oscura si el color es claro, clara si es oscuro. */
export function tintaSobre(hex: string): string {
  const m = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(hex);
  if (!m) return "#1a1004";
  const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16) / 255);
  const lineal = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminancia = 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
  return luminancia > 0.45 ? "#1a1004" : "#f1efea";
}
