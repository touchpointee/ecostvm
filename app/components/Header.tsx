"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-black/20 bg-black shadow-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/ecostvm-logo.png"
            alt="EcoSport TVM - Owners Club, Exploring Avenues"
            className="h-11 w-auto max-w-[160px] object-contain object-left sm:h-12 sm:max-w-[200px]"
          />
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-white hover:text-yellow-400"
          >
            Home
          </Link>
          <a
            href="https://wa.me/917002687376"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold text-black shadow hover:bg-yellow-300"
          >
            Join The Club
          </a>
        </nav>
      </div>
    </header>
  );
}
