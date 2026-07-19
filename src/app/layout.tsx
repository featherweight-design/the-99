import type { Metadata } from "next";
import { Cinzel, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Shell from "../components/shell/shell";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  weight: ["600", "700", "800", "900"],
  subsets: ["latin"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The 99",
  description: "MTG Commander companion",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${cinzel.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
      >
        <body className="min-h-full bg-[color:var(--bg)] text-[color:var(--fg)]">
          <Shell>{children}</Shell>
        </body>
      </html>
    </ClerkProvider>
  );
}
