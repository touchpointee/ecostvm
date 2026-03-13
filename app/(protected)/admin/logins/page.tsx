"use client";

import { useState, useEffect, useCallback } from "react";

export default function LoginsPage() {
  const [numbers, setNumbers] = useState<string[]>([]);
  const [newNumber, setNewNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchNumbers = useCallback(async () => {
    try {
      const res = await fetch("/api/logins");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setNumbers(data.numbers ?? []);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to load logins" });
      setNumbers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNumbers();
  }, [fetchNumbers]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const digits = newNumber.replace(/\D/g, "").trim();
    if (digits.length < 10) {
      setMessage({ type: "error", text: "Enter at least 10 digits." });
      return;
    }
    setAdding(true);
    setMessage(null);
    try {
      const res = await fetch("/api/logins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: digits }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to add" });
        return;
      }
      setMessage({ type: "success", text: "Number added. They can now log in." });
      setNewNumber("");
      await fetchNumbers();
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(phoneNumber: string) {
    setRemoving(phoneNumber);
    setMessage(null);
    try {
      const res = await fetch(`/api/logins/${encodeURIComponent(phoneNumber)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to remove" });
        return;
      }
      setMessage({ type: "success", text: "Number removed." });
      await fetchNumbers();
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b-2 border-black bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-black">Logins</h1>
        <p className="text-sm text-black/70">Manage phone numbers that can access the form and admin.</p>
      </header>
      <div className="p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          <section className="rounded-2xl border-2 border-black bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-black">Add login</h2>
            <p className="mt-1 text-sm text-black/80">
              Add a phone number (digits only). They can then log in with this number to use the feedback form and admin.
            </p>
            <form onSubmit={handleAdd} className="mt-4 flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1">
                <label htmlFor="newNumber" className="block text-sm font-medium text-black">
                  Phone number
                </label>
                <input
                  id="newNumber"
                  type="tel"
                  inputMode="numeric"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-black placeholder:text-black/50 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <button
                type="submit"
                disabled={adding}
                className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-70"
              >
                {adding ? "Adding…" : "Add"}
              </button>
            </form>
          </section>

          <section className="rounded-xl border-2 border-black bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold text-black">Registered numbers</h2>
            <p className="mt-1 text-sm text-black/80">
              These numbers can log in. Remove to revoke access.
            </p>
            {loading ? (
              <p className="mt-4 text-sm text-black/70">Loading…</p>
            ) : numbers.length === 0 ? (
              <p className="mt-4 text-sm text-black/70">No logins yet. Add one above (first number gets access automatically).</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {numbers.map((num) => (
                  <li
                    key={num}
                    className="flex items-center justify-between rounded-lg border-2 border-black bg-white px-3 py-2"
                  >
                    <span className="font-mono text-black">{num}</span>
                    <button
                      type="button"
                      onClick={() => handleRemove(num)}
                      disabled={removing === num}
                      className="rounded-lg border-2 border-black bg-white px-3 py-1 text-xs font-medium text-black hover:bg-black hover:text-white disabled:opacity-60"
                    >
                      {removing === num ? "Removing…" : "Remove"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {message && (
            <p
              className={`rounded-lg border-2 border-black p-3 text-sm ${
                message.type === "success" ? "bg-yellow-100 text-black" : "bg-black text-white"
              }`}
            >
              {message.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
