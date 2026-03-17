"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type UpcomingBirthday = {
  id: string;
  name: string;
  membershipNumber: string;
  dateOfBirth: string;
  nextBirthday: string;
  daysUntil: number;
};

export default function AdminBirthdaysPage() {
  const [testName, setTestName] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<UpcomingBirthday[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [testModalOpen, setTestModalOpen] = useState(false);

  const fetchUpcomingBirthdays = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/birthdays/upcoming?limit=100", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load upcoming birthdays");
      setItems(data.items ?? []);
    } catch (error) {
      setItems([]);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to load upcoming birthdays" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUpcomingBirthdays();
  }, [fetchUpcomingBirthdays]);

  async function handleTestSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/birthdays/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: testName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send test birthday card");
      setMessage({ type: "success", text: `Birthday test card sent for ${testName.trim()}.` });
      setTestModalOpen(false);
      setTestName("");
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to send test birthday card" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b-2 border-black bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-black">Birthday Test</h1>
            <p className="text-sm text-black/70">Send a sample birthday card and review upcoming birthdays in order.</p>
          </div>
          <Link
            href="/admin"
            className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
          >
            Back to dashboard
          </Link>
          <button
            type="button"
            onClick={() => setTestModalOpen(true)}
            className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300"
          >
            Send test
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="rounded-xl border-2 border-black bg-white p-6 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-black">Upcoming birthdays</h2>
                <p className="mt-1 text-sm text-black/80">Sorted by the next upcoming birthday date.</p>
              </div>
              <button
                type="button"
                onClick={fetchUpcomingBirthdays}
                className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <p className="mt-4 text-sm text-black/70">Loading birthdays...</p>
            ) : items.length === 0 ? (
              <p className="mt-4 text-sm text-black/70">No upcoming birthdays found.</p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border-2 border-black">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-black text-white">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Membership</th>
                      <th className="px-3 py-2">DOB</th>
                      <th className="px-3 py-2">Next birthday</th>
                      <th className="px-3 py-2">In</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black bg-white">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-black">{item.name}</td>
                        <td className="px-3 py-2 text-black">{item.membershipNumber || "-"}</td>
                        <td className="px-3 py-2 text-black">{item.dateOfBirth || "-"}</td>
                        <td className="px-3 py-2 text-black">{item.nextBirthday}</td>
                        <td className="px-3 py-2 text-black">{item.daysUntil === 0 ? "Today" : `${item.daysUntil} day(s)`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {message && (
            <p className={`rounded-lg border-2 border-black p-3 text-sm ${message.type === "success" ? "bg-yellow-100 text-black" : "bg-black text-white"}`}>
              {message.text}
            </p>
          )}
        </div>
      </div>

      {testModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setTestModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="birthday-test-modal-title"
        >
          <div
            className="w-full max-w-lg rounded-2xl border-2 border-black bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-black bg-yellow-100 px-4 py-4 sm:px-6">
              <div>
                <h2 id="birthday-test-modal-title" className="text-lg font-semibold text-black">Send test card</h2>
                <p className="text-sm text-black/70">Enter a name to test the birthday image in your group.</p>
              </div>
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                className="rounded-lg p-2 text-black hover:bg-black hover:text-white"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <form onSubmit={handleTestSend} className="space-y-4">
                <input
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="Enter test name"
                  className="block w-full rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500"
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={sending || !testName.trim()}
                    className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-70"
                  >
                    {sending ? "Sending..." : "Send test"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestModalOpen(false)}
                    className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
