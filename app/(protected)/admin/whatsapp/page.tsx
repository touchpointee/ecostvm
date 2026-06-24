"use client";

import { useCallback, useEffect, useState } from "react";

type Status = "Connected" | "Connecting" | "Disconnected";

type WhatsAppLog = {
  id: string;
  timestamp: string | null;
  type: string;
  action: string;
  ip: string;
  userAgent: string;
  adminAuthorized: boolean | null;
  statusCode: number | null;
  reason: string;
  location: unknown;
};

function splitJids(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );
}

export default function WhatsAppConfigPage() {
  const [status, setStatus] = useState<Status>("Disconnected");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [appreciationJid, setAppreciationJid] = useState("");
  const [escalationJid, setEscalationJid] = useState("");
  const [birthdayJid, setBirthdayJid] = useState("");
  const [registrationJid, setRegistrationJid] = useState("");
  const [serviceJid, setServiceJid] = useState("");
  const [savingJids, setSavingJids] = useState(false);
  const [jidsSaved, setJidsSaved] = useState(false);
  const [fetchingGroups, setFetchingGroups] = useState(false);
  const [groupsList, setGroupsList] = useState<{ id: string; subject?: string }[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [removingConnections, setRemovingConnections] = useState(false);
  const [groupsModalOpen, setGroupsModalOpen] = useState(false);
  const [qrHint, setQrHint] = useState<string | null>(null);
  const [connectClickedAt, setConnectClickedAt] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

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
      const a = data.appreciationGroupJid ?? "";
      const e = data.escalationGroupJid ?? "";
      const b = data.birthdayGroupJid ?? "";
      const r = data.registrationGroupJid ?? "";
      const s = data.serviceGroupJid ?? "";
      setAppreciationJid(a);
      setEscalationJid(e);
      setBirthdayJid(b);
      setRegistrationJid(r);
      setServiceJid(s);
      setJidsSaved(Boolean(a || e || b || r || s));
    } catch {
      setAppreciationJid("");
      setEscalationJid("");
      setBirthdayJid("");
      setRegistrationJid("");
      setServiceJid("");
      setJidsSaved(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    setLogsError(null);
    try {
      const res = await fetch("/api/whatsapp/logs?limit=25", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load logs.");
      setWhatsappLogs(data.logs ?? []);
    } catch (e) {
      setLogsError(e instanceof Error ? e.message : "Failed to load logs.");
      setWhatsappLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchJids();
    fetchQR();
    fetchLogs();
  }, [fetchStatus, fetchJids, fetchQR, fetchLogs]);

  useEffect(() => {
    if (connectClickedAt == null) return;
    const t = setTimeout(() => setConnectClickedAt(null), 30000);
    return () => clearTimeout(t);
  }, [connectClickedAt]);

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
    poll();
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
      const maxAttempts = 40;
      const intervalMs = 1500;
      let disconnectedStreak = 0;
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
            disconnectedStreak = 0;
          }
          if (s === "Disconnected") {
            disconnectedStreak++;
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
    let locationData = null;
    try {
      if (typeof window !== "undefined" && navigator.geolocation) {
        locationData = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
              });
            },
            (error) => {
              resolve({ error: error.message || "Permission denied or failed" });
            },
            { timeout: 5000 }
          );
        });
      } else {
        locationData = { error: "Geolocation not supported" };
      }
    } catch {
      locationData = { error: "Failed to get location" };
    }

    try {
      await fetch("/api/whatsapp/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: locationData }),
      });
      await fetchStatus();
      await fetchLogs();
      setQrDataUrl(null);
      setMessage("WhatsApp session logged out.");
    } catch {
      setMessage("Failed to logout from WhatsApp.");
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleRemoveAllConnections() {
    if (
      status === "Connecting" &&
      !window.confirm("This will clear the current QR. You will need to click Connect again to get a new one. Continue?")
    ) {
      return;
    }
    setRemovingConnections(true);
    setMessage(null);
    setQrHint(null);
    let locationData = null;
    try {
      if (typeof window !== "undefined" && navigator.geolocation) {
        locationData = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
              });
            },
            (error) => {
              resolve({ error: error.message || "Permission denied or failed" });
            },
            { timeout: 5000 }
          );
        });
      } else {
        locationData = { error: "Geolocation not supported" };
      }
    } catch {
      locationData = { error: "Failed to get location" };
    }

    try {
      await fetch("/api/whatsapp/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: locationData }),
      });
      await fetchStatus();
      await fetchLogs();
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
          birthdayGroupJid: birthdayJid.trim(),
          registrationGroupJid: registrationJid.trim(),
          serviceGroupJid: serviceJid.trim(),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setJidsSaved(true);
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

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b-2 border-black bg-white px-4 py-4 sm:px-6">
        <h1 className="text-lg font-semibold text-black">WhatsApp config</h1>
        <p className="text-sm text-black/70">Manage WhatsApp connection, group JIDs, and groups list</p>
      </header>
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
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
                {status === "Connected" ? "Connected" : status === "Connecting" ? "Connecting..." : "Disconnected"}
              </div>
              {status !== "Connected" && (
                <>
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={connecting}
                    className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-70"
                  >
                    {connecting ? "Connecting..." : "Connect WhatsApp"}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveAllConnections}
                    disabled={removingConnections || (connectClickedAt != null && Date.now() - connectClickedAt < 30000)}
                    className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white disabled:opacity-70"
                  >
                    {removingConnections
                      ? "Removing..."
                      : connectClickedAt != null && Date.now() - connectClickedAt < 30000
                        ? "Remove all connections (wait 30s for QR...)"
                        : "Remove all connections"}
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
                  {loggingOut ? "Logging out..." : "Logout WhatsApp"}
                </button>
              )}
            </div>
            {status !== "Connected" && (
              <div className="mt-4">
                {status === "Disconnected" && (
                  <p className="mb-3 text-sm font-medium text-black">
                    Click <strong>Connect WhatsApp</strong> above to link your phone. QR will appear here.
                  </p>
                )}
                <p className="mb-1 text-sm text-black">Scan QR with WhatsApp (Linked Devices):</p>
                <p className="mb-2 text-xs text-black/60">
                  QR can take 10-15 seconds and refreshes automatically. Wait for it before clicking Remove all connections.
                </p>
                {statusError && (
                  <div className="mb-3 rounded-lg border-2 border-red-300 bg-red-50 p-3 text-sm text-red-800">
                    Connection failed: {statusError}.
                  </div>
                )}
                <div className="inline-block rounded-lg border-2 border-black bg-white p-3 sm:p-4">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="WhatsApp QR" className="h-56 w-56 sm:h-64 sm:w-64" />
                  ) : (
                    <div className="flex h-56 w-56 flex-col items-center justify-center rounded border-2 border-dashed border-black text-center text-black/70 sm:h-64 sm:w-64">
                      <span>{status === "Connecting" ? "Waiting for QR..." : "No QR yet"}</span>
                      {qrHint && <span className="mt-2 max-w-[240px] text-xs">{qrHint}</span>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border-2 border-black bg-white p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-black">Group JIDs</h2>
                <p className="mt-1 text-sm text-black/80">
                  Set one or more group JIDs for each section. Separate multiple JIDs with commas or new lines.
                </p>
              </div>
              {jidsSaved && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 ring-2 ring-green-400">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
            </div>

            {jidsSaved ? (
              <div className="mt-4 space-y-3 text-sm">
                {[
                  { label: "Appreciation group JID", value: appreciationJid },
                  { label: "Escalation group JID", value: escalationJid },
                  { label: "Birthday wishes group JID", value: birthdayJid },
                  { label: "New registration group JID", value: registrationJid },
                  { label: "Service booking group JID", value: serviceJid },
                ].map(({ label, value }) => {
                  const items = splitJids(value);
                  return (
                    <div key={label} className="rounded-lg border-2 border-black bg-white px-3 py-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-black/50">{label}</p>
                      {items.length > 0 ? (
                        <div className="mt-1 space-y-1">
                          {items.map((item) => (
                            <p key={item} className="break-all font-mono text-sm text-black">
                              {item}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-black/30">Not set</p>
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setJidsSaved(false)}
                  className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-black hover:text-white"
                >
                  Edit
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveJids} className="mt-4 space-y-4 text-sm">
                <div>
                  <label htmlFor="appreciationJid" className="block font-medium text-black">Appreciation group JID</label>
                  <textarea
                    id="appreciationJid"
                    value={appreciationJid}
                    onChange={(e) => setAppreciationJid(e.target.value)}
                    placeholder={"120363426233905530@g.us\n120363426233905531@g.us"}
                    rows={3}
                    className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label htmlFor="escalationJid" className="block font-medium text-black">Escalation group JID</label>
                  <textarea
                    id="escalationJid"
                    value={escalationJid}
                    onChange={(e) => setEscalationJid(e.target.value)}
                    placeholder={"120363426233905530@g.us\n120363426233905531@g.us"}
                    rows={3}
                    className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label htmlFor="birthdayJid" className="block font-medium text-black">Birthday wishes group JID</label>
                  <textarea
                    id="birthdayJid"
                    value={birthdayJid}
                    onChange={(e) => setBirthdayJid(e.target.value)}
                    placeholder={"120363426233905530@g.us\n120363426233905531@g.us"}
                    rows={3}
                    className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label htmlFor="registrationJid" className="block font-medium text-black">New registration group JID</label>
                  <p className="mb-1 text-xs text-black/50">
                    Groups that receive a notification whenever someone submits the registration form.
                  </p>
                  <textarea
                    id="registrationJid"
                    value={registrationJid}
                    onChange={(e) => setRegistrationJid(e.target.value)}
                    placeholder={"120363426233905530@g.us\n120363426233905531@g.us"}
                    rows={3}
                    className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label htmlFor="serviceJid" className="block font-medium text-black">Service booking group JID</label>
                  <p className="mb-1 text-xs text-black/50">
                    Groups that receive a notification whenever someone submits the service booking request form.
                  </p>
                  <textarea
                    id="serviceJid"
                    value={serviceJid}
                    onChange={(e) => setServiceJid(e.target.value)}
                    placeholder={"120363426233905530@g.us\n120363426233905531@g.us"}
                    rows={3}
                    className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={savingJids}
                    className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-70"
                  >
                    {savingJids ? "Saving..." : "Save JIDs"}
                  </button>
                  {(appreciationJid || escalationJid || birthdayJid || registrationJid || serviceJid) && (
                    <button
                      type="button"
                      onClick={() => setJidsSaved(true)}
                      className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-black hover:text-white"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
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

          <section className="rounded-xl border-2 border-black bg-white p-6 shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-black">Logout / disconnection logs</h2>
                <p className="mt-1 text-sm text-black/80">Recent WhatsApp disconnect events saved from the server.</p>
              </div>
              <button
                type="button"
                onClick={fetchLogs}
                disabled={loadingLogs}
                className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-black hover:text-white disabled:opacity-70"
              >
                {loadingLogs ? "Refreshing..." : "Refresh logs"}
              </button>
            </div>
            {logsError && (
              <div className="mt-4 rounded-lg border-2 border-red-300 bg-red-50 p-3 text-sm text-red-800">
                {logsError}
              </div>
            )}
            <div className="mt-4 overflow-hidden rounded-lg border-2 border-black">
              {loadingLogs && whatsappLogs.length === 0 ? (
                <div className="p-4 text-sm text-black/70">Loading logs...</div>
              ) : whatsappLogs.length === 0 ? (
                <div className="p-4 text-sm text-black/70">No WhatsApp logs found.</div>
              ) : (
                <div className="max-h-96 overflow-y-auto divide-y-2 divide-black">
                  {whatsappLogs.map((log) => {
                    const locationText =
                      log.location && typeof log.location === "object"
                        ? JSON.stringify(log.location)
                        : log.location
                          ? String(log.location)
                          : "";
                    return (
                      <div key={log.id} className="bg-white p-4 text-sm text-black">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold">
                            {log.action || "WhatsApp event"}
                            {log.type && <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-900">{log.type}</span>}
                          </p>
                          <p className="text-xs text-black/60">
                            {log.timestamp
                              ? new Date(log.timestamp).toLocaleString("en-IN", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })
                              : "Time unknown"}
                          </p>
                        </div>
                        <div className="mt-2 grid gap-1 text-xs text-black/70 sm:grid-cols-2">
                          {log.ip && <p className="break-all">IP: {log.ip}</p>}
                          {log.adminAuthorized !== null && <p>Admin authorized: {log.adminAuthorized ? "Yes" : "No"}</p>}
                          {log.statusCode !== null && <p>Status code: {log.statusCode}</p>}
                          {log.reason && <p className="sm:col-span-2">Reason: {log.reason}</p>}
                          {locationText && <p className="break-all sm:col-span-2">Location: {locationText}</p>}
                          {log.userAgent && <p className="break-all sm:col-span-2">Device: {log.userAgent}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
                <div className="flex items-center justify-between border-b-2 border-black bg-yellow-100 px-4 py-4 sm:px-6">
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
                <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-6">
                  <p className="mb-4 text-sm text-black/80">Load WhatsApp groups. IDs appear below and in server console.</p>
                  <button
                    type="button"
                    onClick={handleFetchGroups}
                    disabled={fetchingGroups || status !== "Connected"}
                    className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-70"
                  >
                    {fetchingGroups ? "Fetching..." : "Fetch Groups"}
                  </button>
                  {groupsList.length > 0 && (
                    <ul className="mt-4 max-h-52 space-y-1 overflow-y-auto rounded border-2 border-black bg-white p-3 text-sm">
                      {groupsList.map((g) => (
                        <li key={g.id} className="font-mono text-black">
                          <span className="text-black/70">{g.id}</span>
                          {g.subject != null && g.subject !== "" && <span className="ml-2 text-black">- {g.subject}</span>}
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
