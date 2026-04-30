"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type BirthdayMember = {
  id: string;
  name: string;
  membershipNumber: string;
  dateOfBirth: string;
};

export default function AdminDashboardPage() {
  const [sendingBirthdayWishes, setSendingBirthdayWishes] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<
    {
      id: string;
      name: string;
      vehicleNumber: string;
      type: string;
      heading: string;
      createdAt: string | null;
      whatsappSent: boolean;
      whatsappError: string | null;
      attempts: number;
    }[]
  >([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [todayBirthdays, setTodayBirthdays] = useState<BirthdayMember[]>([]);
  const [loadingTodayBirthdays, setLoadingTodayBirthdays] = useState(false);

  const fetchFeedbacks = useCallback(async () => {
    setLoadingFeedbacks(true);
    try {
      const res = await fetch("/api/feedback/list");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load feedbacks");
      setFeedbacks(
        (data.items ?? []).map((f: Record<string, unknown>) => ({
          id: f.id as string,
          name: f.name as string,
          vehicleNumber: f.vehicleNumber as string,
          type: f.type as string,
          heading: f.heading as string,
          createdAt: f.createdAt as string | null,
          whatsappSent: !!f.whatsappSent,
          whatsappError: f.whatsappError as string | null,
          attempts: (f.attempts as number) ?? 0,
        }))
      );
    } catch (e) {
      console.error(e);
      setFeedbacks([]);
    } finally {
      setLoadingFeedbacks(false);
    }
  }, []);

  const fetchTodayBirthdays = useCallback(async () => {
    setLoadingTodayBirthdays(true);
    try {
      const res = await fetch("/api/birthdays/upcoming?limit=200", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load birthdays");
      const todays = (data.items ?? []).filter((item: { daysUntil?: number }) => item.daysUntil === 0);
      setTodayBirthdays(
        todays.map((item: Record<string, unknown>) => ({
          id: String(item.id ?? ""),
          name: String(item.name ?? "Member"),
          membershipNumber: String(item.membershipNumber ?? ""),
          dateOfBirth: String(item.dateOfBirth ?? ""),
        }))
      );
    } catch (e) {
      console.error(e);
      setTodayBirthdays([]);
    } finally {
      setLoadingTodayBirthdays(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
    fetchTodayBirthdays();
  }, [fetchFeedbacks, fetchTodayBirthdays]);

  async function handleSendBirthdayWishes() {
    setSendingBirthdayWishes(true);
    setMessage(null);
    try {
      const res = await fetch("/api/birthdays/send", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send birthday wishes.");
      }

      if (typeof data.statusMessage === "string" && data.statusMessage) {
        setMessage(data.statusMessage);
      } else if (Array.isArray(data.errors) && data.errors.length > 0 && (data.sent ?? 0) === 0 && (data.skipped ?? 0) === 0) {
        setMessage(data.errors.join(" | "));
      } else if ((data.sent ?? 0) === 0 && (data.skipped ?? 0) === 0) {
        setMessage("No birthdays found for today.");
      } else {
        const parts = [`Sent ${data.sent ?? 0}`, `skipped ${data.skipped ?? 0}`];
        const extra =
          Array.isArray(data.errors) && data.errors.length > 0 ? ` Errors: ${data.errors.join(" | ")}` : "";
        setMessage(`Birthday wishes processed: ${parts.join(", ")}.${extra}`);
      }
      await fetchTodayBirthdays();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to send birthday wishes.");
    } finally {
      setSendingBirthdayWishes(false);
    }
  }

  async function handleRetry(feedbackId: string) {
    setRetryingId(feedbackId);
    setMessage(null);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/retry`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage(data.error ? `Retry failed: ${data.error}` : "Retry failed.");
      } else {
        setMessage("WhatsApp notification sent successfully.");
      }
      await fetchFeedbacks();
    } catch {
      setMessage("Retry failed due to a network error.");
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b-2 border-black bg-white px-4 py-4 sm:px-6">
        <h1 className="text-lg font-semibold text-black">Dashboard</h1>
        <p className="text-sm text-black/70">Feedback, birthdays, and registration links</p>
      </header>
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
          <section className="rounded-2xl border-2 border-black bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-black">Today birthday members</h2>
                <p className="mt-1 text-sm text-black/70">Members celebrating birthday today.</p>
              </div>
              <button
                type="button"
                onClick={fetchTodayBirthdays}
                disabled={loadingTodayBirthdays}
                className="rounded-lg border-2 border-black bg-white px-3 py-1 text-xs font-medium text-black hover:bg-black hover:text-white disabled:opacity-70"
              >
                {loadingTodayBirthdays ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            <div className="mt-4 rounded-lg border-2 border-black bg-white p-3">
              {loadingTodayBirthdays ? (
                <p className="text-sm text-black/70">Loading birthday members...</p>
              ) : todayBirthdays.length === 0 ? (
                <p className="text-sm text-black/70">No birthdays today.</p>
              ) : (
                <ul className="space-y-2 text-sm text-black">
                  {todayBirthdays.map((member) => (
                    <li key={member.id} className="rounded border border-black/20 bg-yellow-50 px-3 py-2">
                      <span className="font-semibold">{member.name}</span>
                      {member.membershipNumber && <span className="ml-2 text-black/70">({member.membershipNumber})</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="rounded-2xl border-2 border-yellow-400 bg-yellow-50 p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-black">Member Registration Form</h2>
            <p className="mt-1 text-sm text-black/70">Share this link with members so they can register themselves.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href="/register"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-black hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Registration Form
              </a>
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/register`;
                  navigator.clipboard.writeText(url).then(() => setMessage("Registration link copied to clipboard!"));
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Copy Link
              </button>
            </div>
          </section>

          <section className="rounded-xl border-2 border-black bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold text-black">WhatsApp config</h2>
            <p className="mt-1 text-sm text-black/80">
              Manage WhatsApp connection, Group JIDs, and Groups from a dedicated page.
            </p>
            <Link
              href="/admin/whatsapp"
              className="mt-4 inline-flex rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300"
            >
              Open WhatsApp config
            </Link>
          </section>

          <section className="rounded-xl border-2 border-black bg-white p-6 shadow-md">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black">Recent feedback</h2>
              <button
                type="button"
                onClick={fetchFeedbacks}
                disabled={loadingFeedbacks}
                className="rounded-lg border-2 border-black bg-white px-3 py-1 text-xs font-medium text-black hover:bg-black hover:text-white disabled:opacity-70"
              >
                {loadingFeedbacks ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            <p className="mt-1 text-sm text-black/80">Stored feedback and WhatsApp status.</p>
            <div className="mt-4 max-h-80 overflow-y-auto rounded border-2 border-black">
              {feedbacks.length === 0 ? (
                <p className="p-3 text-sm text-black/70">No feedback yet.</p>
              ) : (
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-black text-white">
                    <tr>
                      <th className="px-3 py-2">When</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">WhatsApp</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black bg-white">
                    {feedbacks.map((f) => (
                      <tr key={f.id}>
                        <td className="px-3 py-2 text-black/80">
                          {f.createdAt ? new Date(f.createdAt).toLocaleString() : "-"}
                        </td>
                        <td className="px-3 py-2 text-black">
                          <div className="font-medium">{f.name || "Unnamed"}</div>
                          {f.heading && <div className="text-[11px] text-black/70">{f.heading}</div>}
                        </td>
                        <td className="px-3 py-2 text-black">{f.type}</td>
                        <td className="px-3 py-2">
                          {f.whatsappSent ? (
                            <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-medium text-yellow-800">Sent</span>
                          ) : (
                            <span className="inline-flex rounded-full border border-black bg-white px-2 py-0.5 text-[11px] font-medium text-black">Pending</span>
                          )}
                          {f.whatsappError && <div className="mt-1 text-[11px] text-black">{f.whatsappError}</div>}
                          <div className="mt-1 text-[10px] text-black/60">Attempts: {f.attempts}</div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {!f.whatsappSent && (
                            <button
                              type="button"
                              onClick={() => handleRetry(f.id)}
                              disabled={retryingId === f.id}
                              className="rounded-md bg-yellow-400 px-3 py-1 text-[11px] font-medium text-black hover:bg-yellow-300 disabled:opacity-60"
                            >
                              {retryingId === f.id ? "Retrying..." : "Retry send"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="rounded-xl border-2 border-black bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold text-black">Birthday wishes</h2>
            <p className="mt-1 text-sm text-black/80">
              The scheduler checks birthdays hourly and sends one card per member per calendar day. Each successful send is stored in the database with its WhatsApp message id, so repeat clicks or overlapping jobs cannot post duplicates.
            </p>
            <button
              type="button"
              onClick={handleSendBirthdayWishes}
              disabled={sendingBirthdayWishes}
              className="mt-4 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-70"
            >
              {sendingBirthdayWishes ? "Sending..." : "Send today's birthday wishes"}
            </button>
          </section>

          {message && (
            <p
              className={`rounded-lg border-2 border-black p-3 text-sm ${
                message.startsWith("Failed") || message.startsWith("No ") ? "bg-black text-white" : "bg-yellow-100 text-black"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
