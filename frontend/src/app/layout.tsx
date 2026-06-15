import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Droplets, LayoutDashboard, PlusCircle } from "lucide-react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HydroIQ - Hydropower Pre-Feasibility Platform",
  description:
    "AfCEN Hydropower Pre-Feasibility Study Platform for Africa",
};

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects/new", label: "New Study", icon: PlusCircle },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full flex bg-slate-50">
        {/* Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-gradient-to-b from-[#0c2d48] to-[#0a3d62]">
          {/* Brand */}
          <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/20">
              <Droplets className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                HydroIQ
              </h1>
              <p className="text-[10px] font-medium uppercase tracking-widest text-teal-400/80">
                Pre-Feasibility
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <item.icon className="h-4 w-4 text-slate-400 transition-colors group-hover:text-teal-400" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-white/10 px-6 py-4">
            <p className="text-xs text-slate-500">
              AfCEN Hydropower Platform
            </p>
            <p className="text-[10px] text-slate-600">v1.0.0</p>
          </div>
        </aside>

        {/* Main content */}
        <main className="ml-64 flex-1 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
