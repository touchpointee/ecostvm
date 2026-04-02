"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type FeedbackStatus = "Open" | "In Progress" | "Resolved" | "Closed";

const STATUSES: FeedbackStatus[] = ["Open", "In Progress", "Resolved", "Closed"];

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  Open: "bg-white border border-black text-black",
  "In Progress": "bg-yellow-100 text-yellow-800",
  Resolved: "bg-green-100 text-green-800",
  Closed: "bg-slate-100 text-slate-700",
};

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

type FeedbackReview = {
  rating: number;
  comment: string;
  submittedAt: string;
};

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
  status: FeedbackStatus;
  review: FeedbackReview | null;
  createdAt: string | null;
  whatsappSent: boolean;
  whatsappError: string | null;
  customerWhatsappSent: boolean;
  customerWhatsappError: string | null;
  attempts: number;
};

export default function FeedbacksPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [advisorFilter, setAdvisorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "">("");

  const fetchItems = useCallback(
    async (filters?: {
      name?: string;
      advisor?: string;
      status?: string;
    }) => {
      setLoading(true);
      setMessage(null);
      try {
        const params = new URLSearchParams({ limit: "500" });
        if (filters?.name?.trim()) params.set("name", filters.name.trim());
        if (filters?.advisor?.trim())
          params.set("advisor", filters.advisor.trim());
        if (filters?.status) params.set("status", filters.status);

        const res = await fetch(`/api/feedback/list?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load feedbacks");
        setItems(data.items ?? []);
      } catch (e) {
        setItems([]);
        setMessage({
          type: "error",
          text:
            e instanceof Error ? e.message : "Failed to load feedbacks",
        });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function handleSearch() {
    fetchItems({
      name: nameFilter,
      advisor: advisorFilter,
      status: statusFilter,
    });
  }

  function handleClearFilters() {
    setNameFilter("");
    setAdvisorFilter("");
    setStatusFilter("");
    fetchItems({ name: "", advisor: "", status: "" });
  }

  async function handleRetry(feedbackId: string) {
    setRetryingId(feedbackId);
    setMessage(null);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/retry`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: "error", text: data.error || "Retry failed." });
      } else {
        setMessage({
          type: "success",
          text: "WhatsApp notification sent successfully.",
        });
      }
      await fetchItems({
        name: nameFilter,
        advisor: advisorFilter,
        status: statusFilter,
      });
    } catch {
      setMessage({ type: "error", text: "Retry failed due to a network error." });
    } finally {
      setRetryingId(null);
    }
  }

  async function handleStatusChange(
    feedbackId: string,
    newStatus: FeedbackStatus
  ) {
    setUpdatingStatusId(feedbackId);
    setMessage(null);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error || "Failed to update status.",
        });
      } else {
        setItems((prev) =>
          prev.map((item) =>
            item.id === feedbackId ? { ...item, status: newStatus } : item
          )
        );
        if (newStatus === "Resolved") {
          setMessage({
            type: "success",
            text: "Status updated to Resolved. Customer will be notified on WhatsApp.",
          });
        }
      }
    } catch {
      setMessage({
        type: "error",
        text: "Network error while updating status.",
      });
    } finally {
      setUpdatingStatusId(null);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b-2 border-black bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-black">Feedbacks</h1>
            <p className="text-sm text-black/70">
              Manage status, view reviews, and track WhatsApp delivery.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              fetchItems({
                name: nameFilter,
                advisor: advisorFilter,
                status: statusFilter,
              })
            }
            disabled={loading}
            className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white disabled:opacity-70"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* Filters */}
          <section className="rounded-2xl border-2 border-black bg-white p-5 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-3">
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
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as FeedbackStatus | "")
                }
                className="rounded-lg border-2 border-black bg-white px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500"
              >
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
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

          {/* Table */}
          <section className="rounded-xl border-2 border-black bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-black">
                All feedback records
              </h2>
              <span className="text-sm text-black/60">
                {loading ? "Loading…" : `${items.length} record(s)`}
              </span>
            </div>

            {loading ? (
              <p className="mt-4 text-sm text-black/60">Loading feedbacks…</p>
            ) : items.length === 0 ? (
              <p className="mt-4 text-sm text-black/60">No feedbacks found.</p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border-2 border-black">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-black text-white">
                    <tr>
                      <th className="px-3 py-2">When</th>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2">Vehicle</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Group WA</th>
                      <th className="px-3 py-2">Customer WA</th>
                      <th className="px-3 py-2">Review</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black bg-white">
                    {items.map((item) => (
                      <tr key={item.id} className="align-top">
                        {/* When */}
                        <td className="px-3 py-2 text-black/70">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )
                            : "-"}
                        </td>

                        {/* Customer */}
                        <td className="px-3 py-2 text-black">
                          <div className="font-medium">
                            {item.name || "Unnamed"}
                          </div>
                          <div className="font-mono text-[11px] text-black/60">
                            {item.contactNumber || "-"}
                          </div>
                          {item.advisor && (
                            <div className="text-[11px] text-black/50">
                              Advisor: {item.advisor}
                            </div>
                          )}
                          {item.concerns && (
                            <div className="mt-0.5 max-w-[180px] truncate text-[11px] text-black/60">
                              {item.concerns}
                            </div>
                          )}
                        </td>

                        {/* Vehicle */}
                        <td className="px-3 py-2 text-black">
                          <div>{item.vehicleNumber || "-"}</div>
                          <div className="text-[11px] text-black/50">
                            {item.serviceDate || ""}
                          </div>
                          {item.pickupDrop && (
                            <div className="text-[11px] text-black/50">
                              {item.pickupDrop}
                            </div>
                          )}
                        </td>

                        {/* Type */}
                        <td className="px-3 py-2 text-black">{item.type || "-"}</td>

                        {/* Status */}
                        <td className="px-3 py-2">
                          <select
                            value={item.status}
                            disabled={updatingStatusId === item.id}
                            onChange={(e) =>
                              handleStatusChange(
                                item.id,
                                e.target.value as FeedbackStatus
                              )
                            }
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-500 cursor-pointer ${STATUS_STYLES[item.status]}`}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Group WA */}
                        <td className="px-3 py-2">
                          {item.whatsappSent ? (
                            <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-medium text-yellow-800">
                              Sent
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full border border-black px-2 py-0.5 text-[11px] font-medium text-black">
                              Pending
                            </span>
                          )}
                          {item.whatsappError && (
                            <div className="mt-0.5 max-w-[120px] text-[10px] text-black/60">
                              {item.whatsappError}
                            </div>
                          )}
                        </td>

                        {/* Customer WA */}
                        <td className="px-3 py-2">
                          {item.customerWhatsappSent ? (
                            <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800">
                              DM Sent
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full border border-black px-2 py-0.5 text-[11px] font-medium text-black">
                              Not sent
                            </span>
                          )}
                          {item.customerWhatsappError && (
                            <div className="mt-0.5 max-w-[120px] text-[10px] text-black/60">
                              {item.customerWhatsappError}
                            </div>
                          )}
                        </td>

                        {/* Review */}
                        <td className="px-3 py-2">
                          {item.review ? (
                            <div>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <span
                                    key={star}
                                    className={
                                      star <= item.review!.rating
                                        ? "text-yellow-400"
                                        : "text-black/15"
                                    }
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                              <div className="mt-0.5 text-[10px] font-medium text-black/70">
                                {STAR_LABELS[item.review.rating]}
                              </div>
                              {item.review.comment && (
                                <div className="mt-0.5 max-w-[140px] truncate text-[10px] text-black/60">
                                  {item.review.comment}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-black/40">
                              No review
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1.5">
                            <Link
                              href={`/feedback/${item.id}`}
                              target="_blank"
                              className="inline-flex justify-center rounded-lg border-2 border-black bg-white px-2.5 py-1 text-[11px] font-medium text-black hover:bg-black hover:text-white"
                            >
                              View
                            </Link>
                            {!item.whatsappSent && (
                              <button
                                type="button"
                                onClick={() => handleRetry(item.id)}
                                disabled={retryingId === item.id}
                                className="rounded-md bg-yellow-400 px-2.5 py-1 text-[11px] font-medium text-black hover:bg-yellow-300 disabled:opacity-60"
                              >
                                {retryingId === item.id
                                  ? "Retrying…"
                                  : "Retry WA"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {message && (
            <p
              className={`rounded-lg border-2 border-black p-3 text-sm ${
                message.type === "success"
                  ? "bg-yellow-100 text-black"
                  : "bg-black text-white"
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
