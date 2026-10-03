import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { SplashScreen } from "@/components/SplashScreen";

export const metadata: Metadata = {
  title: "Cleave — Trade yield on Robinhood Chain",
  description:
    "Yield isn't just something you earn — it's something you can trade. Choose Fixed Yield or Trading Yield on live markets on Robinhood Chain.",
  openGraph: {
    images: ["/og-image.webp"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.webp"],
  },
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
