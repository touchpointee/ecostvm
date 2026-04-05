"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ModelPicker from "@/app/components/ModelPicker";

const MODEL_OPTIONS = ["Facelift", "Pre-Facelift"];
const VARIANT_OPTIONS = [
  "Ambient (P/D)",
  "Trend (P/D)",
  "Trend+ (P/D/AT)",
  "Titanium (P/D)",
  "Titanium Plus (O/P/D/AT)",
  "Titanium S (P/D)",
  "Signature (P/D)",
  "Thunder (P/D)",
  "Titanium SE (P/D)",
];
const COLOR_OPTIONS = [
  "Diamond White",
  "Absolute Black",
  "Race Red",
  "Canyon Ridge",
  "Moon Dust Silver",
  "Smoke Grey",
  "Lightning Blue",
  "Kinetic Blue",
  "Mars Red",
  "Golden Bronze",
  "Panther Black",
  "Chill Metallic",
  "Sea Grey",
  "Orange",
  "Others",
];
const BLOOD_GROUP_OPTIONS = ["A+", "A-", "O+", "O-", "AB+", "AB-", "B+", "B-"];
const PAGE_SIZE = 50;

type Member = {
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
  isBlocked: boolean;
  updatedAt: string | null;
};

type MemberFormState = Omit<Member, "updatedAt">;

type Filters = {
  q: string;
  name: string;
  membershipNumber: string;
  contactNumber: string;
  model: string;
  purchaseMonth: string;
  manufacturingYear: string;
  variant: string;
  vehicleNumber: string;
  vehicleColor: string;
  place: string;
  address: string;
  occupation: string;
  mailId: string;
  bloodGroup: string;
  dateOfBirth: string;
  emergencyContact: string;
  suggestions: string;
};

const emptyFilters: Filters = {
  q: "",
  name: "",
  membershipNumber: "",
  contactNumber: "",
  model: "",
  purchaseMonth: "",
  manufacturingYear: "",
  variant: "",
  vehicleNumber: "",
  vehicleColor: "",
  place: "",
  address: "",
  occupation: "",
  mailId: "",
  bloodGroup: "",
  dateOfBirth: "",
  emergencyContact: "",
  suggestions: "",
};

function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-black/60">
        Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total} members
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="rounded-lg border-2 border-black bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-black hover:text-white disabled:opacity-40"
        >
          ← Prev
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-black/40">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`rounded-lg border-2 border-black px-3 py-1.5 text-xs font-semibold ${
                p === page ? "bg-yellow-400 text-black" : "bg-white text-black hover:bg-black hover:text-white"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="rounded-lg border-2 border-black bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-black hover:text-white disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default function MemberSearchPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [results, setResults] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<MemberFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const runSearch = useCallback(async (nextFilters: Filters, p = 1) => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const params = new URLSearchParams();
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value.trim()) params.set(key, value.trim());
      });
      params.set("page", String(p));
      params.set("limit", String(PAGE_SIZE));
      const res = await fetch(`/api/logins?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to search members");
      setResults(data.items ?? []);
      setTotal(data.total ?? 0);
      setPage(p);
      if ((data.items ?? []).length === 0) setStatusMsg("No members matched these filters.");
    } catch (e) {
      setResults([]);
      setTotal(0);
      setStatusMsg(e instanceof Error ? e.message : "Failed to search members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runSearch(emptyFilters, 1);
  }, [runSearch]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function updateEditingField<K extends keyof MemberFormState>(key: K, value: MemberFormState[K]) {
    setEditingMember((current) => (current ? { ...current, [key]: value } : current));
  }

  const handleToggleBlock = async (memberSpec: Member) => {
    const newStatus = !memberSpec.isBlocked;
    try {
      const res = await fetch(`/api/logins/${memberSpec.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setResults((prev) => prev.map((m) => m.id === memberSpec.id ? { ...m, isBlocked: newStatus } : m));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleDelete = async (memberSpec: Member) => {
    if (!window.confirm(`Delete ${memberSpec.name}? They will no longer be able to log in.`)) return;
    try {
      const res = await fetch(`/api/logins/${memberSpec.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setResults((prev) => prev.filter((m) => m.id !== memberSpec.id));
      setTotal((t) => t - 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMember) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      if (!/^[a-zA-Z ]+$/.test(editingMember.name)) { setSaveMsg("Name should only contain letters and spaces."); setSaving(false); return; }
      if (!/^\d{10}$/.test(editingMember.contactNumber.replace(/\D/g, ""))) { setSaveMsg("Contact number must be exactly 10 digits."); setSaving(false); return; }
      if (!/^([A-Za-z]{2}[ -]?[0-9]{1,2}[ -]?[A-Za-z]{0,2}[ -]?[0-9]{4}|[0-9]{2}[ -]?[Bb][Hh][ -]?[0-9]{4}[ -]?[A-Za-z]{1,2})$/.test(editingMember.vehicleNumber)) { setSaveMsg("Invalid vehicle number format."); setSaving(false); return; }

      const res = await fetch("/api/logins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editingMember, mode: "edit" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSaveMsg("Member updated successfully.");
      setEditingMember(null);
      await runSearch(filters, page);
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Failed to save member");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500";
  const editInputCls = "mt-1 block w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500";
  const editSelectCls = `${editInputCls} bg-white`;
  const labelCls = "block text-sm font-medium text-black";

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b-2 border-black bg-white px-4 py-4 sm:px-6">
        <h1 className="text-lg font-semibold text-black">Member Search</h1>
        <p className="text-sm text-black/70">Search, edit, block or delete members.</p>
      </header>

      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-full space-y-6">

          {/* Filters */}
          <section className="rounded-2xl border-2 border-black bg-white p-5 shadow-lg">
            {/* General search */}
            <input
              value={filters.q}
              onChange={(e) => updateFilter("q", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch(filters, 1)}
              placeholder="General search across all fields…"
              className={`${inputCls} w-full mb-4`}
            />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {/* Personal */}
              <input value={filters.name} onChange={(e) => updateFilter("name", e.target.value)} placeholder="Name" className={inputCls} />
              <input value={filters.membershipNumber} onChange={(e) => updateFilter("membershipNumber", e.target.value)} placeholder="Membership No" className={inputCls} />
              <input value={filters.contactNumber} onChange={(e) => updateFilter("contactNumber", e.target.value)} placeholder="Contact No" className={inputCls} />
              <input value={filters.emergencyContact} onChange={(e) => updateFilter("emergencyContact", e.target.value)} placeholder="Emergency Contact" className={inputCls} />
              <input value={filters.bloodGroup} onChange={(e) => updateFilter("bloodGroup", e.target.value)} placeholder="Blood Group" className={inputCls} />
              <input value={filters.dateOfBirth} onChange={(e) => updateFilter("dateOfBirth", e.target.value)} placeholder="Date of Birth" className={inputCls} />
              <input value={filters.occupation} onChange={(e) => updateFilter("occupation", e.target.value)} placeholder="Occupation" className={inputCls} />
              <input value={filters.mailId} onChange={(e) => updateFilter("mailId", e.target.value)} placeholder="Mail ID" className={inputCls} />

              {/* Vehicle */}
              <select value={filters.model} onChange={(e) => updateFilter("model", e.target.value)} className={`${inputCls} bg-white`}>
                <option value="">Model (All)</option>
                {MODEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <input value={filters.manufacturingYear} onChange={(e) => updateFilter("manufacturingYear", e.target.value)} placeholder="Manufacturing Year" className={inputCls} />
              <input value={filters.purchaseMonth} onChange={(e) => updateFilter("purchaseMonth", e.target.value)} placeholder="Purchase Month" className={inputCls} />
              <select value={filters.variant} onChange={(e) => updateFilter("variant", e.target.value)} className={`${inputCls} bg-white`}>
                <option value="">Variant (All)</option>
                {VARIANT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <select value={filters.vehicleColor} onChange={(e) => updateFilter("vehicleColor", e.target.value)} className={`${inputCls} bg-white`}>
                <option value="">Color (All)</option>
                {COLOR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <input value={filters.vehicleNumber} onChange={(e) => updateFilter("vehicleNumber", e.target.value)} placeholder="Vehicle No" className={inputCls} />

              {/* Location */}
              <input value={filters.place} onChange={(e) => updateFilter("place", e.target.value)} placeholder="Place" className={inputCls} />
              <input value={filters.address} onChange={(e) => updateFilter("address", e.target.value)} placeholder="Address" className={inputCls} />

              {/* Suggestions */}
              <input value={filters.suggestions} onChange={(e) => updateFilter("suggestions", e.target.value)} placeholder="Suggestions (keyword)" className={inputCls} />

            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button onClick={() => runSearch(filters, 1)} className="rounded-lg bg-yellow-400 px-6 py-2 text-sm font-semibold text-black hover:bg-yellow-300">
                Search
              </button>
              <button
                onClick={() => { setFilters(emptyFilters); runSearch(emptyFilters, 1); }}
                className="rounded-lg border-2 border-black bg-white px-5 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
              >
                Clear all
              </button>
              {Object.values(filters).some((v) => v !== "") && (
                <span className="text-xs text-black/50">
                  {Object.values(filters).filter((v) => v !== "").length} filter{Object.values(filters).filter((v) => v !== "").length !== 1 ? "s" : ""} active
                </span>
              )}
            </div>
          </section>

          {/* Results */}
          <section className="rounded-xl border-2 border-black bg-white p-6 shadow-md">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-black">
                Results
                {total > 0 && <span className="ml-2 text-sm font-normal text-black/60">({total} total)</span>}
              </h2>
              {statusMsg && <span className="text-sm text-black/60">{statusMsg}</span>}
            </div>

            {loading ? (
              <p className="mt-4 text-sm text-black/70">Loading...</p>
            ) : (
              <>
                <div className="mt-4 overflow-x-auto rounded-lg border-2 border-black">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-black text-white">
                      <tr>
                        <th className="whitespace-nowrap px-3 py-2">Name</th>
                        <th className="whitespace-nowrap px-3 py-2">Membership No</th>
                        <th className="whitespace-nowrap px-3 py-2">Contact No</th>
                        <th className="whitespace-nowrap px-3 py-2">Model</th>
                        <th className="whitespace-nowrap px-3 py-2">Purchase Month</th>
                        <th className="whitespace-nowrap px-3 py-2">Mfg Year</th>
                        <th className="whitespace-nowrap px-3 py-2">Variant</th>
                        <th className="whitespace-nowrap px-3 py-2">Color</th>
                        <th className="whitespace-nowrap px-3 py-2">Vehicle No</th>
                        <th className="whitespace-nowrap px-3 py-2">Place</th>
                        <th className="whitespace-nowrap px-3 py-2">Address</th>
                        <th className="whitespace-nowrap px-3 py-2">Occupation</th>
                        <th className="whitespace-nowrap px-3 py-2">Mail ID</th>
                        <th className="whitespace-nowrap px-3 py-2">Blood Group</th>
                        <th className="whitespace-nowrap px-3 py-2">Date of Birth</th>
                        <th className="whitespace-nowrap px-3 py-2">Emergency Contact</th>
                        <th className="whitespace-nowrap px-3 py-2">Suggestions</th>
                        <th className="whitespace-nowrap px-3 py-2">Status</th>
                        <th className="whitespace-nowrap px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/10 bg-white">
                      {results.map((m) => (
                        <tr
                          key={m.id}
                          onClick={() => router.push(`/admin/logins/${m.id}`)}
                          className="cursor-pointer hover:bg-yellow-50 active:bg-yellow-100"
                          title="Click to view details"
                        >
                          <td className="whitespace-nowrap px-3 py-2 font-medium text-black">{m.name || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-black">{m.membershipNumber || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 font-mono text-black">{m.contactNumber || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-black">{m.model || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-black">{m.purchaseMonth || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-black">{m.manufacturingYear || "—"}</td>
                          <td className="max-w-[150px] truncate px-3 py-2 text-black" title={m.variant}>{m.variant || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-black">{m.vehicleColor || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 font-mono text-black">{m.vehicleNumber || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-black">{m.place || "—"}</td>
                          <td className="max-w-[140px] truncate px-3 py-2 text-black" title={m.address}>{m.address || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-black">{m.occupation || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-black">{m.mailId || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-black">{m.bloodGroup || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-black">{m.dateOfBirth || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 font-mono text-black">{m.emergencyContact || "—"}</td>
                          <td className="max-w-[160px] truncate px-3 py-2 text-black/60" title={m.suggestions}>{m.suggestions || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2">
                            {m.isBlocked ? (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 border border-red-200">BLOCKED</span>
                            ) : (
                              <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 border border-green-200">Active</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setEditingMember({
                                  id: m.id, name: m.name, membershipNumber: m.membershipNumber,
                                  contactNumber: m.contactNumber, model: m.model,
                                  purchaseMonth: m.purchaseMonth, manufacturingYear: m.manufacturingYear,
                                  variant: m.variant, vehicleColor: m.vehicleColor,
                                  vehicleNumber: m.vehicleNumber, place: m.place, address: m.address,
                                  occupation: m.occupation, mailId: m.mailId, bloodGroup: m.bloodGroup,
                                  dateOfBirth: m.dateOfBirth, emergencyContact: m.emergencyContact,
                                  suggestions: m.suggestions, isBlocked: m.isBlocked,
                                }); }}
                                className="rounded-md border-2 border-black bg-white px-2 py-1 text-[11px] font-medium text-black hover:bg-black hover:text-white"
                              >Edit</button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleToggleBlock(m); }}
                                className={`rounded-md border-2 border-black px-2 py-1 text-[11px] font-medium ${m.isBlocked ? "bg-green-500 text-white hover:bg-green-600" : "bg-orange-500 text-white hover:bg-orange-600"}`}
                              >{m.isBlocked ? "Unblock" : "Block"}</button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDelete(m); }}
                                className="rounded-md border-2 border-black bg-red-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-red-700"
                              >Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!loading && results.length === 0 && (
                        <tr>
                          <td colSpan={19} className="px-3 py-8 text-center text-sm text-black/60">
                            {statusMsg ?? "No records found."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={(p) => runSearch(filters, p)} />
              </>
            )}
          </section>

          {saveMsg && (
            <p className={`rounded-lg border-2 border-black p-3 text-sm ${saveMsg === "Member updated successfully." ? "bg-yellow-100 text-black" : "bg-black text-white"}`}>
              {saveMsg}
            </p>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditingMember(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-member-title"
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border-2 border-black bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-black bg-yellow-100 px-4 py-4 sm:px-6">
              <div>
                <h2 id="edit-member-title" className="text-lg font-semibold text-black">Edit member</h2>
                <p className="text-sm text-black/70">{editingMember.name}</p>
              </div>
              <button type="button" onClick={() => setEditingMember(null)} className="rounded-lg p-2 text-black hover:bg-black hover:text-white" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 sm:p-6">
              {saveMsg && (
                <div className={`mb-4 rounded-lg border-2 border-black p-3 text-sm ${saveMsg === "Member updated successfully." ? "bg-yellow-100 text-black" : "bg-black text-white"}`}>
                  {saveMsg}
                </div>
              )}
              <form onSubmit={handleSave} className="space-y-6">
                {/* Personal */}
                <div>
                  <p className="mb-3 border-b-2 border-black pb-1 text-xs font-bold uppercase tracking-widest text-black">Personal</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="e-name" className={labelCls}>Name *</label>
                      <input id="e-name" value={editingMember.name} onChange={(e) => updateEditingField("name", e.target.value.replace(/[^a-zA-Z ]/g, ""))} required className={editInputCls} />
                    </div>
                    <div>
                      <label htmlFor="e-membershipNumber" className={labelCls}>Membership No</label>
                      <input id="e-membershipNumber" value={editingMember.membershipNumber} onChange={(e) => updateEditingField("membershipNumber", e.target.value)} className={editInputCls} />
                    </div>
                    <div>
                      <label htmlFor="e-contactNumber" className={labelCls}>Contact No *</label>
                      <input id="e-contactNumber" type="tel" inputMode="numeric" maxLength={10} value={editingMember.contactNumber} onChange={(e) => updateEditingField("contactNumber", e.target.value.replace(/\D/g, ""))} required className={editInputCls} />
                    </div>
                    <div>
                      <label htmlFor="e-dateOfBirth" className={labelCls}>Date of Birth *</label>
                      <input id="e-dateOfBirth" type="date" value={editingMember.dateOfBirth} onChange={(e) => updateEditingField("dateOfBirth", e.target.value)} required className={editInputCls} />
                    </div>
                    <div>
                      <label htmlFor="e-bloodGroup" className={labelCls}>Blood Group</label>
                      <select id="e-bloodGroup" value={editingMember.bloodGroup} onChange={(e) => updateEditingField("bloodGroup", e.target.value)} className={editSelectCls}>
                        <option value="">Select</option>
                        {BLOOD_GROUP_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="e-emergencyContact" className={labelCls}>Emergency Contact</label>
                      <input id="e-emergencyContact" type="tel" inputMode="numeric" maxLength={10} value={editingMember.emergencyContact} onChange={(e) => updateEditingField("emergencyContact", e.target.value.replace(/\D/g, ""))} className={editInputCls} />
                    </div>
                    <div>
                      <label htmlFor="e-occupation" className={labelCls}>Occupation</label>
                      <input id="e-occupation" value={editingMember.occupation} onChange={(e) => updateEditingField("occupation", e.target.value)} className={editInputCls} />
                    </div>
                    <div>
                      <label htmlFor="e-mailId" className={labelCls}>Mail ID</label>
                      <input id="e-mailId" type="email" value={editingMember.mailId} onChange={(e) => updateEditingField("mailId", e.target.value)} className={editInputCls} />
                    </div>
                  </div>
                </div>
                {/* Location */}
                <div>
                  <p className="mb-3 border-b-2 border-black pb-1 text-xs font-bold uppercase tracking-widest text-black">Location</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="e-place" className={labelCls}>Place *</label>
                      <input id="e-place" value={editingMember.place} onChange={(e) => updateEditingField("place", e.target.value)} required className={editInputCls} />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="e-address" className={labelCls}>Address *</label>
                      <textarea id="e-address" rows={2} value={editingMember.address} onChange={(e) => updateEditingField("address", e.target.value)} required className={editInputCls} />
                    </div>
                  </div>
                </div>
                {/* Vehicle */}
                <div>
                  <p className="mb-3 border-b-2 border-black pb-1 text-xs font-bold uppercase tracking-widest text-black">Vehicle</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className={labelCls}>Model</label>
                      <div className="mt-2">
                        <ModelPicker value={editingMember.model} onChange={(v) => updateEditingField("model", v)} />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="e-purchaseMonth" className={labelCls}>Purchase Month</label>
                      <input id="e-purchaseMonth" value={editingMember.purchaseMonth} onChange={(e) => updateEditingField("purchaseMonth", e.target.value)} placeholder="e.g. March 2022" className={editInputCls} />
                    </div>
                    <div>
                      <label htmlFor="e-manufacturingYear" className={labelCls}>Manufacturing Year</label>
                      <input id="e-manufacturingYear" value={editingMember.manufacturingYear} onChange={(e) => updateEditingField("manufacturingYear", e.target.value)} placeholder="e.g. 2022" className={editInputCls} />
                    </div>
                    <div>
                      <label htmlFor="e-variant" className={labelCls}>Variant</label>
                      <select id="e-variant" value={editingMember.variant} onChange={(e) => updateEditingField("variant", e.target.value)} className={editSelectCls}>
                        <option value="">Select</option>
                        {VARIANT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="e-vehicleColor" className={labelCls}>Color of the Vehicle</label>
                      <select id="e-vehicleColor" value={editingMember.vehicleColor} onChange={(e) => updateEditingField("vehicleColor", e.target.value)} className={editSelectCls}>
                        <option value="">Select</option>
                        {COLOR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="e-vehicleNumber" className={labelCls}>Vehicle No *</label>
                      <input id="e-vehicleNumber" value={editingMember.vehicleNumber} onChange={(e) => updateEditingField("vehicleNumber", e.target.value.toUpperCase())} required className={`${editInputCls} uppercase`} />
                    </div>
                  </div>
                </div>
                {/* Suggestions */}
                <div>
                  <p className="mb-3 border-b-2 border-black pb-1 text-xs font-bold uppercase tracking-widest text-black">Suggestions</p>
                  <textarea id="e-suggestions" rows={3} value={editingMember.suggestions} onChange={(e) => updateEditingField("suggestions", e.target.value)} className={editInputCls} />
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button type="submit" disabled={saving} className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-70">
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                  <button type="button" onClick={() => setEditingMember(null)} className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white">
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
