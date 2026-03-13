"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const nav = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/logins", label: "Logins" },
  ];

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="w-56 shrink-0 border-r-2 border-black bg-black">
        <div className="sticky top-0 flex h-screen flex-col py-4">
          <div className="px-4 pb-4">
            <span className="text-sm font-semibold text-white">EcoSport TVM</span>
            <span className="block text-xs text-white/70">Admin</span>
          </div>
          <nav className="flex-1 space-y-0.5 px-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
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
              className="block rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              ← Feedback form
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-white/90 hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}
