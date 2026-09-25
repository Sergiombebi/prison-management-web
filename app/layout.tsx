import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SCRIPT_PALETTE, SCRIPT_THEME } from "@/components/layout/theme-toggle";
import { SCRIPT_VIEW_TRANSITION_GUARD } from "@/components/layout/view-transition-guard";
import { I18nProvider } from "@/components/layout/i18n-provider";
import { ToastProvider } from "@/components/ui/toast";
import { getLocale, getT } from "@/lib/i18n/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: {
      default: `${t.app.nom} — ${t.app.nomComplet}`,
      template: `%s · ${t.app.nom}`,
    },
    description: "Gestion de l'écrou, des mandats, de la discipline et des états de l'établissement pénitentiaire.",
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0d100f" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, t] = await Promise.all([getLocale(), getT()]);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_VIEW_TRANSITION_GUARD }} />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME }} />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_PALETTE }} />
      </head>
      <body className="min-h-full">
        <I18nProvider messages={t} locale={locale}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
