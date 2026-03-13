"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [number, setNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => {
        if (res.ok) {
          router.replace("/");
          return;
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const digits = number.replace(/\D/g, "").trim();
    if (digits.length < 10) {
      setError("Enter at least 10 digits.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: digits }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }
      router.push("/");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-black/70">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm rounded-2xl border-2 border-black bg-white p-6 shadow-lg">
        <h1 className="text-xl font-bold text-black">Login</h1>
        <p className="mt-1 text-sm text-black/70">
          Enter your registered phone number to continue.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="number" className="block text-sm font-medium text-black">
              Phone number
            </label>
            <input
              id="number"
              type="tel"
              inputMode="numeric"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="e.g. 9876543210"
              className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2.5 text-black placeholder:text-black/50 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              autoFocus
              required
            />
          </div>
          {error && (
            <p className="text-sm text-black">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-yellow-400 py-3 font-semibold text-black hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-70"
          >
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-black/60">
          Not registered? Ask an admin to add your number.
        </p>
      </div>
      <p className="mt-6 text-center text-sm text-black/60">
        <Link href="/" className="text-yellow-600 hover:underline">
          ← Back
        </Link>
      </p>
    </div>
  );
}
