import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { SplashScreen } from "@/components/SplashScreen";

export const metadata: Metadata = {
  title: "Cleave — Yield trading for everyone on Robinhood Chain",
  description:
    "Lock a fixed rate on your USDG, or go long on where yield is heading. Two choices, every number in dollars. Built on Robinhood Chain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-background text-foreground min-h-screen selection:bg-amber/30 selection:text-white">
        <Providers>
          {/* SplashScreen is a client component — mounts & unmounts itself */}
          <SplashScreen />
          {children}
        </Providers>
      </body>
    </html>
  );
}
