import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { getOrganizacion } from "@/lib/data/organizacion";
import { tintaSobre } from "@/lib/color";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

// Corre antes de hidratar para no mostrar un parpadeo claro→oscuro cuando el switch de tema
// (ver theme-toggle.tsx) había quedado en modo oscuro. Claro es el default: sin nada guardado, o
// con "light" guardado, no hace falta tocar nada.
const SCRIPT_TEMA = `try{if(localStorage.getItem('tema')==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}`;

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
});

export async function generateMetadata(): Promise<Metadata> {
  const org = await getOrganizacion();
  return {
    title: { default: org.nombre, template: `%s · ${org.nombre}` },
    description: "Turnos y agenda.",
  };
}

export const viewport: Viewport = {
  themeColor: "#f4f5f7",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const org = await getOrganizacion();

  return (
    <html
      lang="es-UY"
      className={`${poppins.variable} h-full antialiased`}
      style={{ "--color-brand": org.colorMarca, "--color-brand-ink": tintaSobre(org.colorMarca) } as React.CSSProperties}
      // El script de tema agrega data-theme="dark" antes de hidratar cuando corresponde: es un
      // mismatch esperado contra el <html> que rendereó el servidor, no un bug.
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning: extensiones como Grammarly inyectan atributos en <body> antes de
          hidratar (data-gr-ext-installed, etc.); no es un mismatch real de la app. */}
      <body className="min-h-full" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
