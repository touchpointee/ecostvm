"use client";

import { useCallback, useEffect, useState } from "react";

type Member = {
  id: string;
  name: string;
  membershipNumber: string;
  contactNumber: string;
  vehicleColor: string;
  vehicleNumber: string;
  place: string;
  address: string;
  bloodGroup: string;
  dateOfBirth: string;
  isBlocked: boolean;
  updatedAt: string | null;
};

type MemberFormState = Omit<Member, "updatedAt">;

type Filters = {
  q: string;
  name: string;
  membershipNumber: string;
  contactNumber: string;
  vehicleNumber: string;
  vehicleColor: string;
  place: string;
  address: string;
  bloodGroup: string;
  dateOfBirth: string;
};

const emptyFilters: Filters = {
  q: "",
  name: "",
  membershipNumber: "",
  contactNumber: "",
  vehicleNumber: "",
  vehicleColor: "",
  place: "",
  address: "",
  bloodGroup: "",
  dateOfBirth: "",
};

export default function MemberSearchPage() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [results, setResults] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<MemberFormState | null>(null);
  const [saving, setSaving] = useState(false);

  const runSearch = useCallback(async (nextFilters: Filters) => {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value.trim()) params.set(key, value.trim());
      });
      const res = await fetch(`/api/logins?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to search members");
      setResults(data.items ?? []);
      if ((data.items ?? []).length === 0) {
        setMessage("No members matched these filters.");
      }
    } catch (e) {
      setResults([]);
      setMessage(e instanceof Error ? e.message : "Failed to search members");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleBlock = async (memberSpec: Member) => {
    const newStatus = !memberSpec.isBlocked;
    try {
      const res = await fetch(`/api/logins/${memberSpec.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }
      
      setResults((prev) => 
        prev.map((m) => m.id === memberSpec.id ? { ...m, isBlocked: newStatus } : m)
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleDelete = async (memberSpec: Member) => {
    if (!window.confirm(`Are you sure you want to delete ${memberSpec.name}? They will no longer be able to log in.`)) return;

    try {
      const res = await fetch(`/api/logins/${memberSpec.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete member");
      }

      setResults((prev) => prev.filter((m) => m.id !== memberSpec.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  useEffect(() => {
    runSearch(emptyFilters);
  }, [runSearch]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    const next = { ...filters, [key]: value };
    setFilters(next);
  }

  function updateEditingField<K extends keyof MemberFormState>(key: K, value: MemberFormState[K]) {
    setEditingMember((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMember) return;
    setSaving(true);
    setMessage(null);
    try {
      // Validations
      if (!/^[a-zA-Z ]+$/.test(editingMember.name)) {
        setMessage("Name should only contain letters and spaces.");
        setSaving(false);
        return;
      }
      if (!/^\d{10}$/.test(editingMember.contactNumber.replace(/\D/g, ''))) {
        setMessage("Contact number must be exactly 10 digits.");
        setSaving(false);
        return;
      }
      if (!/^([A-Za-z]{2}[ -]?[0-9]{1,2}[ -]?[A-Za-z]{0,2}[ -]?[0-9]{4}|[0-9]{2}[ -]?[Bb][Hh][ -]?[0-9]{4}[ -]?[A-Za-z]{1,2})$/.test(editingMember.vehicleNumber)) {
        setMessage("Invalid vehicle number format (e.g., KL01AB1234 or 21BH1234AA).");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/logins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editingMember, mode: "edit" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save member");
      setMessage("Member updated successfully.");
      setEditingMember(null);
      await runSearch(filters);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to save member");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b-2 border-black bg-white px-4 py-4 sm:px-6">
        <h1 className="text-lg font-semibold text-black">Member Search</h1>
        <p className="text-sm text-black/70">Search members with all available filters.</p>
      </header>
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="rounded-2xl border-2 border-black bg-white p-6 shadow-lg">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <input value={filters.q} onChange={(e) => updateFilter("q", e.target.value)} placeholder="General search" className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
              <input value={filters.name} onChange={(e) => updateFilter("name", e.target.value)} placeholder="Name" className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
              <input value={filters.membershipNumber} onChange={(e) => updateFilter("membershipNumber", e.target.value)} placeholder="Membership no" className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
              <input value={filters.contactNumber} onChange={(e) => updateFilter("contactNumber", e.target.value)} placeholder="Contact no" className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
              <input value={filters.vehicleNumber} onChange={(e) => updateFilter("vehicleNumber", e.target.value)} placeholder="Vehicle no" className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
              <input value={filters.vehicleColor} onChange={(e) => updateFilter("vehicleColor", e.target.value)} placeholder="Vehicle color" className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
              <input value={filters.place} onChange={(e) => updateFilter("place", e.target.value)} placeholder="Place" className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
              <input value={filters.address} onChange={(e) => updateFilter("address", e.target.value)} placeholder="Address" className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
              <input value={filters.bloodGroup} onChange={(e) => updateFilter("bloodGroup", e.target.value)} placeholder="Blood group" className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
              <input value={filters.dateOfBirth} onChange={(e) => updateFilter("dateOfBirth", e.target.value)} placeholder="Date of birth" className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={() => runSearch(filters)} className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300">
                Search
              </button>
              <button
                onClick={() => {
                  setFilters(emptyFilters);
                  runSearch(emptyFilters);
                }}
                className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
              >
                Clear filters
              </button>
            </div>
          </section>

          <section className="rounded-xl border-2 border-black bg-white p-6 shadow-md">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black">Results</h2>
              <span className="text-sm text-black/70">{loading ? "Loading..." : `${results.length} record(s)`}</span>
            </div>
            <div className="mt-4 overflow-x-auto rounded-lg border-2 border-black">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-black text-white">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Membership</th>
                    <th className="px-3 py-2">Contact</th>
                    <th className="px-3 py-2">Color</th>
                    <th className="px-3 py-2">Vehicle</th>
                    <th className="px-3 py-2">Place</th>
                    <th className="px-3 py-2">Address</th>
                    <th className="px-3 py-2">Blood</th>
                    <th className="px-3 py-2">DOB</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black bg-white">
                  {results.map((member) => (
                    <tr key={member.id}>
                      <td className="px-3 py-2 text-black">{member.name || "-"}</td>
                      <td className="px-3 py-2 text-black">{member.membershipNumber || "-"}</td>
                      <td className="px-3 py-2 font-mono text-black">{member.contactNumber || "-"}</td>
                      <td className="px-3 py-2 text-black">{member.vehicleColor || "-"}</td>
                      <td className="px-3 py-2 text-black">{member.vehicleNumber || "-"}</td>
                      <td className="px-3 py-2 text-black">{member.place || "-"}</td>
                      <td className="px-3 py-2 text-black">{member.address || "-"}</td>
                      <td className="px-3 py-2 text-black">{member.bloodGroup || "-"}</td>
                      <td className="px-3 py-2 text-black">{member.dateOfBirth || "-"}</td>
                      <td className="px-3 py-2">
                        {member.isBlocked && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 border border-red-200">
                            BLOCKED
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingMember({
                                id: member.id,
                                name: member.name,
                                membershipNumber: member.membershipNumber,
                                contactNumber: member.contactNumber,
                                vehicleColor: member.vehicleColor,
                                vehicleNumber: member.vehicleNumber,
                                place: member.place,
                                address: member.address,
                                bloodGroup: member.bloodGroup,
                                dateOfBirth: member.dateOfBirth,
                                isBlocked: member.isBlocked,
                              })
                            }
                            className="rounded-lg border-2 border-black bg-white px-3 py-1 text-xs font-medium text-black hover:bg-black hover:text-white"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleBlock(member)}
                            className={`rounded-lg border-2 border-black px-3 py-1 text-xs font-medium ${
                              member.isBlocked
                                ? "bg-green-500 text-white hover:bg-green-600"
                                : "bg-orange-500 text-white hover:bg-orange-600"
                            }`}
                          >
                            {member.isBlocked ? "Unblock" : "Block"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(member)}
                            className="rounded-lg border-2 border-black bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && results.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-3 py-6 text-center text-sm text-black/70">
                        {message ?? "No records found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

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
                <p className="text-sm text-black/70">Update member details and save changes.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="rounded-lg p-2 text-black hover:bg-black hover:text-white"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {message && message === "Member updated successfully." && (
                <div className="mb-4 rounded-lg border-2 border-black bg-yellow-100 p-3 text-sm text-black">
                   {message}
                </div>
              )}
              {message && message !== "Member updated successfully." && !loading && !saving && (
                <div className="mb-4 rounded-lg border-2 border-black bg-black p-3 text-sm text-white">
                   {message}
                </div>
              )}
              <form onSubmit={handleSave} className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium text-black">Name</label>
                  <input id="edit-name" value={editingMember.name} onChange={(e) => updateEditingField("name", e.target.value.replace(/[^a-zA-Z ]/g, ''))} pattern="[a-zA-Z ]+" title="Name should only contain letters and spaces" required className="mt-1 block w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
                </div>
                <div>
                  <label htmlFor="edit-membershipNumber" className="block text-sm font-medium text-black">Membership no</label>
                  <input id="edit-membershipNumber" value={editingMember.membershipNumber} onChange={(e) => updateEditingField("membershipNumber", e.target.value)} required className="mt-1 block w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
                </div>
                <div>
                  <label htmlFor="edit-contactNumber" className="block text-sm font-medium text-black">Contact no</label>
                  <input id="edit-contactNumber" value={editingMember.contactNumber} onChange={(e) => updateEditingField("contactNumber", e.target.value.replace(/\D/g, ''))} type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} title="Contact number must be exactly 10 digits" required className="mt-1 block w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
                </div>
                <div>
                  <label htmlFor="edit-vehicleColor" className="block text-sm font-medium text-black">Color of vehicle</label>
                  <input id="edit-vehicleColor" value={editingMember.vehicleColor} onChange={(e) => updateEditingField("vehicleColor", e.target.value)} required className="mt-1 block w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
                </div>
                <div>
                  <label htmlFor="edit-vehicleNumber" className="block text-sm font-medium text-black">Vehicle no</label>
                  <input id="edit-vehicleNumber" value={editingMember.vehicleNumber} pattern="^([A-Za-z]{2}[ -]?[0-9]{1,2}[ -]?[A-Za-z]{0,2}[ -]?[0-9]{4}|[0-9]{2}[ -]?[Bb][Hh][ -]?[0-9]{4}[ -]?[A-Za-z]{1,2})$" title="Valid format: KL01AB1234 or 21BH1234AA" onChange={(e) => updateEditingField("vehicleNumber", e.target.value.toUpperCase())} required className="mt-1 block w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500 uppercase" />
                </div>
                <div>
                  <label htmlFor="edit-place" className="block text-sm font-medium text-black">Place</label>
                  <input id="edit-place" value={editingMember.place} onChange={(e) => updateEditingField("place", e.target.value)} required className="mt-1 block w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="edit-address" className="block text-sm font-medium text-black">Address</label>
                  <textarea id="edit-address" rows={3} value={editingMember.address} onChange={(e) => updateEditingField("address", e.target.value)} required className="mt-1 block w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
                </div>
                <div>
                  <label htmlFor="edit-bloodGroup" className="block text-sm font-medium text-black">Blood group</label>
                  <input id="edit-bloodGroup" value={editingMember.bloodGroup} onChange={(e) => updateEditingField("bloodGroup", e.target.value)} required className="mt-1 block w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
                </div>
                <div>
                  <label htmlFor="edit-dateOfBirth" className="block text-sm font-medium text-black">Date of birth</label>
                  <input id="edit-dateOfBirth" value={editingMember.dateOfBirth} onChange={(e) => updateEditingField("dateOfBirth", e.target.value)} required className="mt-1 block w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
                </div>
                <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
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
