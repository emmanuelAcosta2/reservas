"use client";

const CLAVE = "tema";

/**
 * Sin estado de React a propósito: ambos íconos se renderizan siempre y CSS decide cuál se ve
 * según el atributo `data-theme` del `<html>` (mismo atributo que pone el script anti-flash de
 * layout.tsx). Leer/guardar el modo actual pasa a ser cosa del DOM, no de React — evita el
 * mismatch de hidratación que traería inicializar un useState desde `document`.
 */
export function ThemeToggle() {
  function alternar() {
    const oscuro = document.documentElement.dataset.theme === "dark";
    if (oscuro) {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }
    try {
      localStorage.setItem(CLAVE, oscuro ? "light" : "dark");
    } catch {
      // Sin acceso a localStorage (modo privado, etc.): el cambio se aplica igual, solo no persiste.
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label="Cambiar modo claro/oscuro"
      className="fixed top-3 right-3 z-30 grid size-10 place-items-center rounded-full border border-line bg-surface text-fg shadow-sm lg:top-4 lg:right-4"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="hidden size-5 fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [[data-theme=dark]_&]:block"
      >
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-5 fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round] [[data-theme=dark]_&]:hidden"
      >
        <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
      </svg>
    </button>
  );
}
