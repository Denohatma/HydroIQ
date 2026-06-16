"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { useState } from "react";
import { Droplets, LayoutDashboard, PlusCircle, Menu, X } from "lucide-react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects/new", label: "New Study", icon: PlusCircle },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <head>
        <title>HydroIQ - Hydropower Pre-Feasibility Platform</title>
        <meta
          name="description"
          content="AfCEN Hydropower Pre-Feasibility Study Platform for Africa"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-full flex bg-slate-50">
        {/* Mobile top bar */}
        <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-[#0c2d48] to-[#0a3d62] px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20">
              <Droplets className="h-4 w-4 text-teal-400" />
            </div>
            <span className="text-base font-bold text-white">HydroIQ</span>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white hover:bg-white/10"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-gradient-to-b from-[#0c2d48] to-[#0a3d62] transition-transform duration-200 lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
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
                onClick={() => setSidebarOpen(false)}
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
              AfCEN - Africa&apos;s Infrastructure Intelligence Layer
            </p>
            <p className="text-[10px] text-slate-600">v1.0.0</p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-h-screen pt-14 lg:pt-0 lg:ml-64">{children}</main>
      </body>
    </html>
  );
}
