"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Status = "Connected" | "Connecting" | "Disconnected";

export default function AdminDashboardPage() {
  const [status, setStatus] = useState<Status>("Disconnected");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [appreciationJid, setAppreciationJid] = useState("");
  const [escalationJid, setEscalationJid] = useState("");
  const [savingJids, setSavingJids] = useState(false);
  const [fetchingGroups, setFetchingGroups] = useState(false);
  const [groupsList, setGroupsList] = useState<{ id: string; subject?: string }[]>([]);
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
  const [loggingOut, setLoggingOut] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      const data = await res.json();
      setStatus(data.status ?? "Disconnected");
    } catch {
      setStatus("Disconnected");
    }
  }, []);

  const fetchQR = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/qr");
      const data = await res.json();
      setQrDataUrl(data.qr ?? null);
    } catch {
      setQrDataUrl(null);
    }
  }, []);

  const fetchJids = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/jids");
      const data = await res.json();
      setAppreciationJid(data.appreciationGroupJid ?? "");
      setEscalationJid(data.escalationGroupJid ?? "");
    } catch {
      setAppreciationJid("");
      setEscalationJid("");
    }
  }, []);

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

  useEffect(() => {
    fetchStatus();
    fetchJids();
    fetchQR();
    fetchFeedbacks();
  }, [fetchStatus, fetchJids, fetchQR, fetchFeedbacks]);

  async function handleConnect() {
    setMessage(null);
    setStatus("Connecting");
    try {
      await fetch("/api/whatsapp/connect", { method: "POST" });
      for (let i = 0; i < 20; i++) {
        try {
          const [statusRes, qrRes] = await Promise.all([
            fetch("/api/whatsapp/status"),
            fetch("/api/whatsapp/qr"),
          ]);
          const statusData = await statusRes.json();
          const qrData = await qrRes.json();
          setStatus(statusData.status ?? "Disconnected");
          setQrDataUrl(qrData.qr ?? null);
          if (statusData.status === "Connected" || qrData.qr) break;
        } catch {
          // ignore
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    } catch {
      setMessage("Failed to start connection.");
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    setMessage(null);
    try {
      await fetch("/api/whatsapp/logout", { method: "POST" });
      await fetchStatus();
      setQrDataUrl(null);
      setMessage("WhatsApp session logged out.");
    } catch {
      setMessage("Failed to logout from WhatsApp.");
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleSaveJids(e: React.FormEvent) {
    e.preventDefault();
    setSavingJids(true);
    setMessage(null);
    try {
      const res = await fetch("/api/whatsapp/jids", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appreciationGroupJid: appreciationJid.trim(),
          escalationGroupJid: escalationJid.trim(),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setMessage("Group JIDs saved.");
    } catch {
      setMessage("Failed to save JIDs.");
    } finally {
      setSavingJids(false);
    }
  }

  async function handleFetchGroups() {
    setFetchingGroups(true);
    setMessage(null);
    try {
      const res = await fetch("/api/whatsapp/groups", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fetch failed");
      setGroupsList(data.groups ?? []);
      setMessage(`Fetched ${(data.groups ?? []).length} groups. Check server console for full list.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to fetch groups.");
      setGroupsList([]);
    } finally {
      setFetchingGroups(false);
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
      <header className="sticky top-0 z-30 border-b-2 border-black bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-black">Dashboard</h1>
        <p className="text-sm text-black/70">WhatsApp, feedback & group JIDs</p>
      </header>
      <div className="p-6">
        <div className="mx-auto max-w-4xl space-y-8">
          <section className="rounded-2xl border-2 border-black bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-black">WhatsApp connection</h2>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  status === "Connected" || status === "Connecting"
                    ? "bg-yellow-100 text-yellow-800 ring-2 ring-yellow-500"
                    : "bg-black text-white ring-2 ring-black"
                }`}
              >
                {status === "Connected" ? "Connected" : status === "Connecting" ? "Connecting…" : "Disconnected"}
              </div>
              {status !== "Connected" && (
                <button
                  type="button"
                  onClick={handleConnect}
                  className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300"
                >
                  Connect WhatsApp
                </button>
              )}
              {status === "Connected" && (
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white disabled:opacity-70"
                >
                  {loggingOut ? "Logging out…" : "Logout WhatsApp"}
                </button>
              )}
            </div>
            {status !== "Connected" && (
              <div className="mt-4">
                <p className="mb-2 text-sm text-black">Scan QR with WhatsApp (Linked Devices):</p>
                <div className="inline-block rounded-lg border-2 border-black bg-white p-4">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="WhatsApp QR" className="h-64 w-64" />
                  ) : (
                    <div className="flex h-64 w-64 items-center justify-center rounded border-2 border-dashed border-black text-black/70">
                      Waiting for QR…
                    </div>
                  )}
                </div>
              </div>
            )}
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
                {loadingFeedbacks ? "Refreshing…" : "Refresh"}
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
                          {f.createdAt ? new Date(f.createdAt).toLocaleString() : "—"}
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
                              {retryingId === f.id ? "Retrying…" : "Retry send"}
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
            <h2 className="text-lg font-semibold text-black">Group JIDs</h2>
            <p className="mt-1 text-sm text-black/80">Set group JIDs for feedback. Use Fetch Groups to see IDs.</p>
            <form onSubmit={handleSaveJids} className="mt-4 space-y-4 text-sm">
              <div>
                <label htmlFor="appreciationJid" className="block font-medium text-black">Appreciation group JID</label>
                <input
                  id="appreciationJid"
                  type="text"
                  value={appreciationJid}
                  onChange={(e) => setAppreciationJid(e.target.value)}
                  placeholder="123456789@g.us"
                  className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label htmlFor="escalationJid" className="block font-medium text-black">Escalation group JID</label>
                <input
                  id="escalationJid"
                  type="text"
                  value={escalationJid}
                  onChange={(e) => setEscalationJid(e.target.value)}
                  placeholder="123456789@g.us"
                  className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <button
                type="submit"
                disabled={savingJids}
                className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-70"
              >
                {savingJids ? "Saving…" : "Save JIDs"}
              </button>
            </form>
          </section>

          <section className="rounded-xl border-2 border-black bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold text-black">Fetch groups</h2>
            <p className="mt-1 text-sm text-black/80">Load WhatsApp groups. IDs in server console and below.</p>
            <button
              type="button"
              onClick={handleFetchGroups}
              disabled={fetchingGroups || status !== "Connected"}
              className="mt-4 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-70"
            >
              {fetchingGroups ? "Fetching…" : "Fetch Groups"}
            </button>
            {groupsList.length > 0 && (
              <ul className="mt-4 max-h-60 space-y-1 overflow-y-auto rounded border-2 border-black bg-white p-3 text-sm">
                {groupsList.map((g) => (
                  <li key={g.id} className="font-mono text-black">
                    <span className="text-black/70">{g.id}</span>
                    {g.subject != null && g.subject !== "" && <span className="ml-2 text-black">— {g.subject}</span>}
                  </li>
                ))}
              </ul>
            )}
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
