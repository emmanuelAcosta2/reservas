import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { getOrganizacion } from "@/lib/data/organizacion";
import { tintaSobre } from "@/lib/color";
import "./globals.css";

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
  themeColor: "#0d0e11",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const org = await getOrganizacion();

  return (
    <html
      lang="es-UY"
      className={`${poppins.variable} h-full antialiased`}
      style={{ "--color-brand": org.colorMarca, "--color-brand-ink": tintaSobre(org.colorMarca) } as React.CSSProperties}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
