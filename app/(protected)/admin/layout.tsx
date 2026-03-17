"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const nav = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/feedbacks", label: "Feedbacks" },
    { href: "/admin/logins", label: "Members" },
    { href: "/admin/logins/search", label: "Search" },
  ];

  const navContent = (
    <>
      <div className="px-4 pb-4">
        <span className="text-sm font-semibold text-white">EcoSport TVM</span>
        <span className="block text-xs text-white/70">Admin</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-2">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMenuOpen(false)}
            className={`block rounded-lg px-3 py-2 text-sm font-medium ${
              pathname === item.href
                ? "bg-yellow-400 text-black"
                : "text-white hover:bg-white/10"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="space-y-0.5 border-t border-white/20 px-2 pt-4">
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="block rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
        >
          Back to feedback form
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-white/90 hover:bg-white/10"
        >
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-white md:flex">
      <header className="sticky top-0 z-40 border-b-2 border-black bg-black md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <span className="text-sm font-semibold text-white">EcoSport TVM</span>
            <span className="block text-xs text-white/70">Admin</span>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-lg border border-white/20 p-2 text-white"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <aside className="hidden w-56 shrink-0 border-r-2 border-black bg-black md:block">
        <div className="sticky top-0 flex h-screen flex-col py-4">
          {navContent}
        </div>
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r-2 border-black bg-black py-4 shadow-xl">
            <div className="mb-2 flex items-center justify-between px-4">
              <div>
                <span className="text-sm font-semibold text-white">EcoSport TVM</span>
                <span className="block text-xs text-white/70">Admin</span>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg p-2 text-white hover:bg-white/10"
                aria-label="Close menu"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {navContent}
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}
