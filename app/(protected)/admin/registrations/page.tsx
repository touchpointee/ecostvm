"use client";

import { useCallback, useEffect, useState } from "react";

type Registration = {
  id: string;
  name: string;
  membershipNumber: string;
  contactNumber: string;
  model: string;
  purchaseMonth: string;
  manufacturingYear: string;
  variant: string;
  vehicleColor: string;
  vehicleNumber: string;
  place: string;
  address: string;
  occupation: string;
  mailId: string;
  bloodGroup: string;
  dateOfBirth: string;
  emergencyContact: string;
  suggestions: string;
  submittedAt: string;
};

type ActionState = { id: string; action: "accept" | "reject" } | null;

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-black/40">{label}</p>
      <p className="mt-0.5 text-sm text-black">{value}</p>
    </div>
  );
}

export default function RegistrationsPage() {
  const [items, setItems] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState<ActionState>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/registrations");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(data.items ?? []);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to load registrations" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function handleAction(id: string, action: "accept" | "reject") {
    setActionState({ id, action });
    setMessage(null);
    try {
      const res = await fetch(`/api/registrations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      setItems((prev) => prev.filter((r) => r.id !== id));
      setExpandedId(null);
      setMessage({
        type: "success",
        text: action === "accept"
          ? "Registration accepted — member added successfully."
          : "Registration rejected and removed.",
      });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Action failed" });
    } finally {
      setActionState(null);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b-2 border-black bg-white px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-black">Pending Registrations</h1>
            <p className="text-sm text-black/60">Review, accept or reject member registration requests.</p>
          </div>
          <button
            onClick={fetchItems}
            className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
          >
            Refresh
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-4">

          {message && (
            <div className={`rounded-xl border-2 border-black p-3 text-sm font-medium ${message.type === "success" ? "bg-yellow-100 text-black" : "bg-black text-white"}`}>
              {message.text}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border-2 border-black bg-white p-10 text-center text-sm text-black/60">
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border-2 border-black bg-white p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-black bg-yellow-50 text-2xl">
                ✓
              </div>
              <p className="font-semibold text-black">No pending registrations</p>
              <p className="mt-1 text-sm text-black/60">All registrations have been reviewed.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-black/60">{items.length} pending registration{items.length !== 1 ? "s" : ""}</p>
              {items.map((reg) => {
                const isExpanded = expandedId === reg.id;
                const isActing = actionState?.id === reg.id;

                return (
                  <div
                    key={reg.id}
                    className="overflow-hidden rounded-2xl border-2 border-black bg-white shadow-sm"
                  >
                    {/* Header row */}
                    <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-black">{reg.name || "Unnamed"}</p>
                          {reg.model && (
                            <span className="rounded-full border border-black/20 bg-yellow-50 px-2 py-0.5 text-[11px] font-medium text-black">
                              {reg.model}
                            </span>
                          )}
                          {reg.variant && (
                            <span className="rounded-full border border-black/20 bg-gray-50 px-2 py-0.5 text-[11px] text-black/70">
                              {reg.variant}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-black/60">
                          <span>{reg.contactNumber}</span>
                          {reg.vehicleNumber && <span>{reg.vehicleNumber}</span>}
                          {reg.place && <span>{reg.place}</span>}
                          <span>Submitted {new Date(reg.submittedAt).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : reg.id)}
                          className="rounded-lg border-2 border-black bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-black hover:text-white"
                        >
                          {isExpanded ? "Hide" : "View all"}
                        </button>
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleAction(reg.id, "reject")}
                          className="rounded-lg border-2 border-red-600 bg-white px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"
                        >
                          {isActing && actionState?.action === "reject" ? "Rejecting…" : "Reject"}
                        </button>
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleAction(reg.id, "accept")}
                          className="rounded-lg bg-yellow-400 px-4 py-1.5 text-xs font-semibold text-black hover:bg-yellow-300 disabled:opacity-50"
                        >
                          {isActing && actionState?.action === "accept" ? "Accepting…" : "Accept"}
                        </button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t-2 border-black/10 bg-gray-50 px-5 py-4">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 md:grid-cols-4">
                          <Field label="Name" value={reg.name} />
                          <Field label="Membership No" value={reg.membershipNumber} />
                          <Field label="Contact No" value={reg.contactNumber} />
                          <Field label="Emergency Contact" value={reg.emergencyContact} />
                          <Field label="Model" value={reg.model} />
                          <Field label="Purchase Month" value={reg.purchaseMonth} />
                          <Field label="Manufacturing Year" value={reg.manufacturingYear} />
                          <Field label="Variant" value={reg.variant} />
                          <Field label="Color" value={reg.vehicleColor} />
                          <Field label="Vehicle No" value={reg.vehicleNumber} />
                          <Field label="Place" value={reg.place} />
                          <Field label="Blood Group" value={reg.bloodGroup} />
                          <Field label="Date of Birth" value={reg.dateOfBirth} />
                          <Field label="Occupation" value={reg.occupation} />
                          <Field label="Mail ID" value={reg.mailId} />
                          <div className="col-span-2">
                            <Field label="Address" value={reg.address} />
                          </div>
                          {reg.suggestions && (
                            <div className="col-span-2 md:col-span-4">
                              <Field label="Suggestions" value={reg.suggestions} />
                            </div>
                          )}
                        </div>

                        {/* Confirm buttons inside expanded */}
                        <div className="mt-5 flex flex-wrap gap-3 border-t border-black/10 pt-4">
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => handleAction(reg.id, "accept")}
                            className="rounded-xl bg-yellow-400 px-6 py-2 text-sm font-bold text-black hover:bg-yellow-300 disabled:opacity-50"
                          >
                            {isActing && actionState?.action === "accept" ? "Accepting…" : "Accept & Add Member"}
                          </button>
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => handleAction(reg.id, "reject")}
                            className="rounded-xl border-2 border-red-600 bg-white px-6 py-2 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"
                          >
                            {isActing && actionState?.action === "reject" ? "Rejecting…" : "Reject & Delete"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
