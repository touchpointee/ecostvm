"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type FeedbackItem = {
  id: string;
  name: string;
  contactNumber: string;
  vehicleNumber: string;
  serviceDate: string;
  advisor: string;
  pickupDrop: string;
  concerns: string;
  type: string;
  heading: string;
  createdAt: string | null;
  whatsappSent: boolean;
  whatsappError: string | null;
  attempts: number;
};

export default function FeedbacksPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [advisorFilter, setAdvisorFilter] = useState("");

  const fetchItems = useCallback(async (filters?: { name?: string; advisor?: string }) => {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({ limit: "500" });
      const name = filters?.name?.trim() ?? "";
      const advisor = filters?.advisor?.trim() ?? "";
      if (name) params.set("name", name);
      if (advisor) params.set("advisor", advisor);

      const res = await fetch(`/api/feedback/list?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load feedbacks");
      setItems(data.items ?? []);
    } catch (e) {
      setItems([]);
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to load feedbacks" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function handleSearch() {
    fetchItems({ name: nameFilter, advisor: advisorFilter });
  }

  function handleClearFilters() {
    setNameFilter("");
    setAdvisorFilter("");
    fetchItems({ name: "", advisor: "" });
  }

  async function handleRetry(feedbackId: string) {
    setRetryingId(feedbackId);
    setMessage(null);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/retry`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: "error", text: data.error || "Retry failed." });
      } else {
        setMessage({ type: "success", text: "WhatsApp notification sent successfully." });
      }
      await fetchItems({ name: nameFilter, advisor: advisorFilter });
    } catch {
      setMessage({ type: "error", text: "Retry failed due to a network error." });
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b-2 border-black bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-black">Feedbacks</h1>
            <p className="text-sm text-black/70">View all feedbacks and WhatsApp delivery status.</p>
          </div>
          <button
            type="button"
            onClick={() => fetchItems({ name: nameFilter, advisor: advisorFilter })}
            disabled={loading}
            className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white disabled:opacity-70"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-2xl border-2 border-black bg-white p-6 shadow-lg">
            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder="Search by customer name"
                className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500"
              />
              <input
                value={advisorFilter}
                onChange={(e) => setAdvisorFilter(e.target.value)}
                placeholder="Search by service advisor"
                className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSearch}
                className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300"
              >
                Search
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
              >
                Clear filters
              </button>
            </div>
          </section>

          <section className="rounded-xl border-2 border-black bg-white p-6 shadow-md">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black">All feedback records</h2>
              <span className="text-sm text-black/70">{loading ? "Loading..." : `${items.length} record(s)`}</span>
            </div>

            {loading ? (
              <p className="mt-4 text-sm text-black/70">Loading feedbacks...</p>
            ) : items.length === 0 ? (
              <p className="mt-4 text-sm text-black/70">No feedbacks found.</p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border-2 border-black">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-black text-white">
                    <tr>
                      <th className="px-3 py-2">When</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Contact</th>
                      <th className="px-3 py-2">Vehicle</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Service</th>
                      <th className="px-3 py-2">WhatsApp</th>
                      <th className="px-3 py-2">Details</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black bg-white">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-black/80">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
                        </td>
                        <td className="px-3 py-2 text-black">
                          <div className="font-medium">{item.name || "Unnamed"}</div>
                          {item.concerns && <div className="max-w-xs truncate text-[11px] text-black/70">{item.concerns}</div>}
                        </td>
                        <td className="px-3 py-2 text-black">
                          <div className="font-mono">{item.contactNumber || "-"}</div>
                          {item.advisor && <div className="text-[11px] text-black/70">Advisor: {item.advisor}</div>}
                        </td>
                        <td className="px-3 py-2 text-black">{item.vehicleNumber || "-"}</td>
                        <td className="px-3 py-2 text-black">{item.type || "-"}</td>
                        <td className="px-3 py-2 text-black">
                          <div>{item.serviceDate || "-"}</div>
                          {item.pickupDrop && <div className="text-[11px] text-black/70">{item.pickupDrop}</div>}
                        </td>
                        <td className="px-3 py-2">
                          {item.whatsappSent ? (
                            <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-medium text-yellow-800">Sent</span>
                          ) : (
                            <span className="inline-flex rounded-full border border-black bg-white px-2 py-0.5 text-[11px] font-medium text-black">Pending</span>
                          )}
                          {item.whatsappError && <div className="mt-1 max-w-xs text-[11px] text-black">{item.whatsappError}</div>}
                          <div className="mt-1 text-[10px] text-black/60">Attempts: {item.attempts}</div>
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            href={`/feedback/${item.id}`}
                            target="_blank"
                            className="rounded-lg border-2 border-black bg-white px-3 py-1 text-xs font-medium text-black hover:bg-black hover:text-white"
                          >
                            View
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {!item.whatsappSent && (
                            <button
                              type="button"
                              onClick={() => handleRetry(item.id)}
                              disabled={retryingId === item.id}
                              className="rounded-md bg-yellow-400 px-3 py-1 text-[11px] font-medium text-black hover:bg-yellow-300 disabled:opacity-60"
                            >
                              {retryingId === item.id ? "Retrying..." : "Retry send"}
                            </button>
                          )}
                        </td>
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
    </div>
  );
}
