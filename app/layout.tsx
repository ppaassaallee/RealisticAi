import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "AI Kiosk | OneSource",
  description:
    "AI Kiosk by OneSource. Meet Alex across TV, tablet, kiosk, phone and web chat, with WhatsApp as an integration option.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
