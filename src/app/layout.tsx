import { theme } from "@/theme";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "twt - X (formerly Twitter) all-in-one toolkit",
  description: "X (formerly Twitter) all-in-one toolkit by @bgwastu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${headerFont.variable} ${textFont.variable}`}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider theme={theme}>{children}</MantineProvider>
      </body>
    </html>
  );
}
