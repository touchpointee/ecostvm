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
  const [removingConnections, setRemovingConnections] = useState(false);
  const [groupsModalOpen, setGroupsModalOpen] = useState(false);
  const [qrHint, setQrHint] = useState<string | null>(null);
  const [connectClickedAt, setConnectClickedAt] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false); // true while handleConnect is running
  const [statusError, setStatusError] = useState<string | null>(null); // from backend when init fails

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status", { cache: "no-store" });
      const data = await res.json();
      setStatus(data.status ?? "Disconnected");
      setStatusError(data.error ?? null);
    } catch {
      setStatus("Disconnected");
      setStatusError(null);
    }
  }, []);

  const fetchQR = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/qr", { cache: "no-store" });
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

  // Re-enable "Remove all connections" 30s after Connect (give time for QR to appear and scan)
  useEffect(() => {
    if (connectClickedAt == null) return;
    const t = setTimeout(() => setConnectClickedAt(null), 30000);
    return () => clearTimeout(t);
  }, [connectClickedAt]);

  // Keep refreshing status + QR while Connecting: every 2s until we have a QR, then every 8s
  useEffect(() => {
    if (status !== "Connecting") return;
    const poll = async () => {
      try {
        const [statusRes, qrRes] = await Promise.all([
          fetch("/api/whatsapp/status", { cache: "no-store" }),
          fetch("/api/whatsapp/qr", { cache: "no-store" }),
        ]);
        const statusData = await statusRes.json();
        const qrData = await qrRes.json();
        const s = statusData.status ?? "Disconnected";
        setStatus(s);
        setStatusError(statusData.error ?? null);
        if (qrData.qr) setQrDataUrl(qrData.qr);
      } catch {
        // ignore
      }
    };
    poll(); // immediate first fetch
    const intervalMs = qrDataUrl ? 8000 : 2000;
    const t = setInterval(poll, intervalMs);
    return () => clearInterval(t);
  }, [status, qrDataUrl]);

  async function handleConnect() {
    if (connecting) return;
    setConnecting(true);
    setMessage(null);
    setQrDataUrl(null);
    setQrHint(null);
    setStatusError(null);
    setStatus("Connecting");
    setConnectClickedAt(Date.now());
    try {
      const connectRes = await fetch("/api/whatsapp/connect", { method: "POST" });
      if (!connectRes.ok) {
        const err = await connectRes.json().catch(() => ({}));
        setMessage(err.error || "Failed to start connection.");
        setStatus("Disconnected");
        setConnectClickedAt(null);
        setConnecting(false);
        return;
      }
      // Poll for up to 60 s. The backend may briefly go "Disconnected" while purging
      // an invalid session and auto-reconnecting (takes ~5 s), so we keep polling
      // through transient disconnects rather than giving up immediately.
      const maxAttempts = 40;   // 40 × 1.5 s ≈ 60 s total
      const intervalMs = 1500;
      let disconnectedStreak = 0; // consecutive "Disconnected" polls
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, i === 0 ? 2000 : intervalMs));
        try {
          const [statusRes, qrRes] = await Promise.all([
            fetch("/api/whatsapp/status", { cache: "no-store" }),
            fetch("/api/whatsapp/qr", { cache: "no-store" }),
          ]);
          const statusData = await statusRes.json();
          const qrData = await qrRes.json();
          const s = statusData.status ?? "Disconnected";
          setStatus(s);
          setStatusError(statusData.error ?? null);
          if (qrData.qr) {
            setQrDataUrl(qrData.qr);
            setMessage(null);
            setConnectClickedAt(null);
          }
          if (qrData.message) {
            setQrHint(qrData.message);
          }
          if (s === "Connected") {
            setConnectClickedAt(null);
            break;
          }
          if (s === "Connecting") {
            disconnectedStreak = 0; // reset – backend is progressing
          }
          if (s === "Disconnected") {
            disconnectedStreak++;
            // Allow up to 8 consecutive "Disconnected" polls (~12 s) so the backend's
            // 5-second auto-reconnect has time to kick in and generate a fresh QR.
            if (disconnectedStreak >= 8) {
              setMessage("Could not connect. Check Coolify logs for errors, then click Connect WhatsApp again.");
              break;
            }
          }
        } catch {
          // ignore network errors during polling
        }
      }
    } catch {
      setMessage("Failed to start connection.");
      setStatus("Disconnected");
      setConnectClickedAt(null);
    } finally {
      setConnecting(false);
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

  async function handleRemoveAllConnections() {
    if (status === "Connecting" && !window.confirm("This will clear the current QR. You’ll need to click Connect again to get a new one. Continue?")) {
      return;
    }
    setRemovingConnections(true);
    setMessage(null);
    setQrHint(null);
    try {
      await fetch("/api/whatsapp/logout", { method: "POST" });
      await fetchStatus();
      setQrDataUrl(null);
      setMessage("All connections removed. Click Connect WhatsApp to get a new QR.");
    } catch {
      setMessage("Failed to remove connections.");
    } finally {
      setRemovingConnections(false);
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
                <>
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={connecting}
                    className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-70"
                  >
                    {connecting ? "Connecting…" : "Connect WhatsApp"}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveAllConnections}
                    disabled={removingConnections || (connectClickedAt != null && Date.now() - connectClickedAt < 30000)}
                    className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white disabled:opacity-70"
                  >
                    {removingConnections ? "Removing…" : connectClickedAt != null && Date.now() - connectClickedAt < 30000 ? "Remove all connections (wait 30s for QR…)" : "Remove all connections"}
                  </button>
                </>
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
                {status === "Disconnected" && (
                  <p className="mb-3 text-sm font-medium text-black">Click <strong>Connect WhatsApp</strong> above to link your phone. QR will appear here.</p>
                )}
                <p className="mb-1 text-sm text-black">Scan QR with WhatsApp (Linked Devices):</p>
                <p className="mb-2 text-xs text-black/60">QR can take 10–15 seconds and refreshes automatically. Wait for it before clicking Remove all connections.</p>
                {statusError && (
                  <div className="mb-3 rounded-lg border-2 border-red-300 bg-red-50 p-3 text-sm text-red-800">
                    Connection failed: {statusError}. In Coolify set <strong>PUPPETEER_EXECUTABLE_PATH</strong> (e.g. /usr/bin/chromium) and use <strong>1 replica</strong>.
                  </div>
                )}
                {status === "Disconnected" && connecting === false && (
                  <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    <strong>If the QR never appears:</strong> In Coolify, keep this app at <strong>1 replica</strong>. Then open your app <strong>Logs</strong> and look for lines containing <code className="rounded bg-amber-100 px-1">[whatsapp]</code> – that will show why the connection failed (e.g. Chromium path, missing libs).
                  </div>
                )}
                <div className="inline-block rounded-lg border-2 border-black bg-white p-4">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="WhatsApp QR" className="h-64 w-64" />
                  ) : (
                    <div className="flex h-64 w-64 flex-col items-center justify-center rounded border-2 border-dashed border-black text-center text-black/70">
                      <span>{status === "Connecting" ? "Waiting for QR…" : "No QR yet"}</span>
                      {qrHint && <span className="mt-2 max-w-[240px] text-xs">{qrHint}</span>}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-black/60">
                  QR needs a long‑running server (VPS, Railway, Render). It will not work on serverless (e.g. Vercel) because each request can hit a different instance.
                </p>
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
            <h2 className="text-lg font-semibold text-black">Groups</h2>
            <p className="mt-1 text-sm text-black/80">Load WhatsApp groups and copy JIDs for Appreciation / Escalation above.</p>
            <button
              type="button"
              onClick={() => setGroupsModalOpen(true)}
              className="mt-4 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300"
            >
              Fetch groups
            </button>
          </section>

          {groupsModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setGroupsModalOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="groups-modal-title"
            >
              <div
                className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border-2 border-black bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b-2 border-black bg-yellow-100 px-6 py-4">
                  <h2 id="groups-modal-title" className="text-lg font-semibold text-black">
                    Fetch groups
                  </h2>
                  <button
                    type="button"
                    onClick={() => setGroupsModalOpen(false)}
                    className="rounded-lg p-1 text-black hover:bg-black hover:text-white"
                    aria-label="Close"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-6">
                  <p className="mb-4 text-sm text-black/80">Load WhatsApp groups. IDs appear below and in server console.</p>
                  <button
                    type="button"
                    onClick={handleFetchGroups}
                    disabled={fetchingGroups || status !== "Connected"}
                    className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-70"
                  >
                    {fetchingGroups ? "Fetching…" : "Fetch Groups"}
                  </button>
                  {groupsList.length > 0 && (
                    <ul className="mt-4 max-h-52 space-y-1 overflow-y-auto rounded border-2 border-black bg-white p-3 text-sm">
                      {groupsList.map((g) => (
                        <li key={g.id} className="font-mono text-black">
                          <span className="text-black/70">{g.id}</span>
                          {g.subject != null && g.subject !== "" && <span className="ml-2 text-black">— {g.subject}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

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
