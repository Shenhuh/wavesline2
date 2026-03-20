import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";

const laguSans = localFont({
  src: [
    { path: "../public/fonts/Lagu Sans Thin.otf", weight: "100", style: "normal" },
    { path: "../public/fonts/Lagu Sans Light.otf", weight: "300", style: "normal" },
    { path: "../public/fonts/LaguSans-Regular.otf", weight: "400", style: "normal" },
    { path: "../public/fonts/Lagu Sans Medium.otf", weight: "500", style: "normal" },
    { path: "../public/fonts/Lagu Sans Bold.otf", weight: "700", style: "normal" },
    { path: "../public/fonts/Lagu Sans Black.otf", weight: "900", style: "normal" },
    { path: "../public/fonts/Lagu Sans Thin Italic.otf", weight: "100", style: "italic" },
    { path: "../public/fonts/Lagu Sans Light Italic.otf", weight: "300", style: "italic" },
    { path: "../public/fonts/Lagu Sans Regular Italic.otf", weight: "400", style: "italic" },
    { path: "../public/fonts/Lagu Sans Medium Italic.otf", weight: "500", style: "italic" },
    { path: "../public/fonts/Lagu Sans Bold Italic.otf", weight: "700", style: "italic" },
    { path: "../public/fonts/Lagu Sans Black Italic.otf", weight: "900", style: "italic" },
  ],
  variable: "--font-lagu",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wavesline",
  description: "Wuthering Waves AI chatbot fan project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={laguSans.variable}>
      <body>{children}</body>
    </html>
  );
}