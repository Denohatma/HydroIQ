import Link from "next/link";
import { Droplets } from "lucide-react";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <title>HydroIQ — AfCEN Hydropower Pre-Feasibility Platform</title>
        <meta
          name="description"
          content="AfCEN Hydropower Pre-Feasibility Study Platform for Africa"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[#0b1220] text-[#e2e8f0]">
        <nav className="sticky top-0 z-50 border-b border-[#d3a54a]/20 bg-[#0f1b2b]/95 backdrop-blur-sm">
          <div className="mx-auto max-w-[1600px] flex items-center justify-between px-4 h-11">
            <div className="flex items-center gap-4 sm:gap-6">
              <Link href="/" className="flex items-center gap-2 shrink-0">
                <Droplets className="h-4 w-4 text-[#d3a54a]" />
                <span
                  className="text-base font-bold tracking-tight text-[#d3a54a]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  HYDROIQ
                </span>
              </Link>
              <div className="flex items-center gap-0.5 text-[10px] font-mono overflow-x-auto no-scrollbar">
                <Link
                  href="/"
                  className="px-2.5 py-1 rounded text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider whitespace-nowrap"
                >
                  Dashboard
                </Link>
                <Link
                  href="/pipeline"
                  className="px-2.5 py-1 rounded text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider whitespace-nowrap"
                >
                  AfCEN Pipeline
                </Link>
                <Link
                  href="/projects/new"
                  className="px-2.5 py-1 rounded text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider whitespace-nowrap"
                >
                  New Study
                </Link>
              </div>
            </div>
            <span className="hidden lg:block text-[9px] font-mono text-[#475569] uppercase tracking-[0.15em] shrink-0">
              AfCEN &middot; Africa&apos;s Infrastructure Intelligence Layer
            </span>
          </div>
        </nav>

        <main className="min-h-[calc(100vh-2.75rem)]">{children}</main>
      </body>
    </html>
  );
}
