import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { themeInitScript } from "@/lib/theme";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Thermal Eye — Predictive Thermal Inspection for Power Grids",
  description:
    "Thermal Eye by Evizen AI reads your thermal imagery, flags failing assets, and predicts which tower fails next — trusted on live infrastructure.",
  metadataBase: new URL("https://thermaleye.app"),
  icons: { icon: "/brand/thermal-eye-logo.png" },
  openGraph: {
    title: "Thermal Eye — Predictive Thermal Inspection",
    description: "See the failure before it happens. AI thermal inspection + predictive maintenance for power grids.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Set the theme class before hydration to prevent a flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
