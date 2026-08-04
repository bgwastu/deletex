import { theme } from "@/theme";
import { LocaleProvider } from "@/i18n/locale-provider";
import { isLocale, messages } from "@/i18n/messages";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Figtree, Lora } from "next/font/google";
import "./global.css";

const headerFont = Lora({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-header",
});

const textFont = Figtree({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-text",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: "DeleteX", description: messages[locale].description };
}

async function getLocale() {
  const cookieLocale = (await cookies()).get("deletex.locale")?.value;
  if (isLocale(cookieLocale)) return cookieLocale;
  return (await headers()).get("accept-language")?.toLowerCase().includes("id")
    ? "id"
    : "en";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${headerFont.variable} ${textFont.variable}`} suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider theme={theme}>
          <LocaleProvider initialLocale={locale}>
            <Notifications />
            {children}
          </LocaleProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
