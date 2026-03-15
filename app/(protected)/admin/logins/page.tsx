"use client";

import Link from "next/link";
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
  source: string;
  updatedAt: string | null;
};

type FormState = Omit<Member, "id" | "source" | "updatedAt">;

const emptyForm: FormState = {
  name: "",
  membershipNumber: "",
  contactNumber: "",
  vehicleColor: "",
  vehicleNumber: "",
  place: "",
  address: "",
  bloodGroup: "",
  dateOfBirth: "",
};

export default function LoginsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/logins");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load members");
      setMembers(data.items ?? []);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to load members" });
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/logins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to save member" });
        return;
      }
      setMessage({ type: "success", text: "Member saved successfully." });
      setForm(emptyForm);
      await fetchMembers();
    } catch {
      setMessage({ type: "error", text: "Something went wrong while saving." });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) {
      setMessage({ type: "error", text: "Choose an Excel file first." });
      return;
    }

    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      const res = await fetch("/api/logins/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Upload failed" });
        return;
      }
      const summary = `Upload finished. Added ${data.inserted}, updated ${data.updated}, skipped ${data.skipped}.`;
      const extra = Array.isArray(data.errors) && data.errors.length > 0 ? ` ${data.errors.join(" | ")}` : "";
      setMessage({ type: "success", text: `${summary}${extra}` });
      setUploadFile(null);
      await fetchMembers();
    } catch {
      setMessage({ type: "error", text: "Something went wrong while uploading." });
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(contactNumber: string) {
    setRemoving(contactNumber);
    setMessage(null);
    try {
      const res = await fetch(`/api/logins/${encodeURIComponent(contactNumber)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to remove member" });
        return;
      }
      setMessage({ type: "success", text: "Member removed." });
      await fetchMembers();
    } catch {
      setMessage({ type: "error", text: "Something went wrong while removing." });
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b-2 border-black bg-white px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-black">Members</h1>
            <p className="text-sm text-black/70">Add single member records or upload an Excel file.</p>
          </div>
          <Link
            href="/admin/logins/search"
            className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
          >
            Open search page
          </Link>
        </div>
      </header>
      <div className="p-6">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-2xl border-2 border-black bg-white p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-black">Add member</h2>
              <p className="mt-1 text-sm text-black/80">
                Contact number is used for login access. If the number already exists, this updates that member.
              </p>
              <form onSubmit={handleSave} className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-black">Name</label>
                  <input id="name" value={form.name} onChange={(e) => updateField("name", e.target.value)} className="mt-1 block w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
                </div>
                <div>
                  <label htmlFor="membershipNumber" className="block text-sm font-medium text-black">Membership no</label>
                  <input id="membershipNumber" value={form.membershipNumber} onChange={(e) => updateField("membershipNumber", e.target.value)} className="mt-1 block w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
                </div>
                <div>
                  <label htmlFor="contactNumber" className="block text-sm font-medium text-black">Contact no</label>
                  <input id="contactNumber" value={form.contactNumber} onChange={(e) => updateField("contactNumber", e.target.value)} required className="mt-1 block w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
                </div>
                <div>
                  <label htmlFor="vehicleColor" className="block text-sm font-medium text-black">Color of vehicle</label>
                  <input id="vehicleColor" value={form.vehicleColor} onChange={(e) => updateField("vehicleColor", e.target.value)} className="mt-1 block w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
                </div>
                <div>
                  <label htmlFor="vehicleNumber" className="block text-sm font-medium text-black">Vehicle no</label>
                  <input id="vehicleNumber" value={form.vehicleNumber} onChange={(e) => updateField("vehicleNumber", e.target.value)} className="mt-1 block w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
                </div>
                <div>
                  <label htmlFor="place" className="block text-sm font-medium text-black">Place</label>
                  <input id="place" value={form.place} onChange={(e) => updateField("place", e.target.value)} className="mt-1 block w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-black">Address</label>
                  <textarea id="address" rows={3} value={form.address} onChange={(e) => updateField("address", e.target.value)} className="mt-1 block w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
                </div>
                <div>
                  <label htmlFor="bloodGroup" className="block text-sm font-medium text-black">Blood group</label>
                  <input id="bloodGroup" value={form.bloodGroup} onChange={(e) => updateField("bloodGroup", e.target.value)} className="mt-1 block w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
                </div>
                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-black">Date of birth</label>
                  <input id="dateOfBirth" value={form.dateOfBirth} onChange={(e) => updateField("dateOfBirth", e.target.value)} placeholder="YYYY-MM-DD or Excel text" className="mt-1 block w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
                </div>
                <div className="md:col-span-2 flex flex-wrap gap-3">
                  <button type="submit" disabled={saving} className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-70">
                    {saving ? "Saving..." : "Save member"}
                  </button>
                  <button type="button" onClick={() => setForm(emptyForm)} className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white">
                    Clear form
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-2xl border-2 border-black bg-white p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-black">Upload Excel</h2>
              <p className="mt-1 text-sm text-black/80">
                Upload `.xlsx` with columns like Name, Membership no, Contact no, Color of the vehicle, Vehicle no, Place, Address, Blood Group, Date of birth.
              </p>
              <form onSubmit={handleUpload} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="memberFile" className="block text-sm font-medium text-black">Excel file</label>
                  <input
                    id="memberFile"
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                    className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-sm text-black file:mr-4 file:rounded-md file:border-0 file:bg-yellow-400 file:px-3 file:py-2 file:font-semibold file:text-black"
                  />
                </div>
                <button type="submit" disabled={uploading} className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-70">
                  {uploading ? "Uploading..." : "Upload data"}
                </button>
              </form>

              <div className="mt-8 rounded-xl border-2 border-black bg-yellow-50 p-4 text-sm text-black/90">
                <p className="font-semibold text-black">How it works</p>
                <p className="mt-2">Existing contact numbers are updated. New contact numbers are inserted and can log in immediately.</p>
              </div>
            </section>
          </div>

          <section className="rounded-xl border-2 border-black bg-white p-6 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-black">Stored members</h2>
                <p className="mt-1 text-sm text-black/80">Latest 1000 records from the portal database.</p>
              </div>
              <button onClick={fetchMembers} className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white">
                Refresh
              </button>
            </div>
            {loading ? (
              <p className="mt-4 text-sm text-black/70">Loading...</p>
            ) : members.length === 0 ? (
              <p className="mt-4 text-sm text-black/70">No members found yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border-2 border-black">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-black text-white">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Membership</th>
                      <th className="px-3 py-2">Contact</th>
                      <th className="px-3 py-2">Vehicle</th>
                      <th className="px-3 py-2">Place</th>
                      <th className="px-3 py-2">Blood</th>
                      <th className="px-3 py-2">DOB</th>
                      <th className="px-3 py-2">Source</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black bg-white">
                    {members.map((member) => (
                      <tr key={member.id}>
                        <td className="px-3 py-2">
                          <div className="font-medium text-black">{member.name || "Unnamed"}</div>
                          {member.address && <div className="max-w-xs truncate text-[11px] text-black/70">{member.address}</div>}
                        </td>
                        <td className="px-3 py-2 text-black">{member.membershipNumber || "-"}</td>
                        <td className="px-3 py-2 font-mono text-black">{member.contactNumber}</td>
                        <td className="px-3 py-2 text-black">
                          <div>{member.vehicleNumber || "-"}</div>
                          {member.vehicleColor && <div className="text-[11px] text-black/70">{member.vehicleColor}</div>}
                        </td>
                        <td className="px-3 py-2 text-black">{member.place || "-"}</td>
                        <td className="px-3 py-2 text-black">{member.bloodGroup || "-"}</td>
                        <td className="px-3 py-2 text-black">{member.dateOfBirth || "-"}</td>
                        <td className="px-3 py-2 text-black">{member.source}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemove(member.contactNumber)}
                            disabled={removing === member.contactNumber}
                            className="rounded-lg border-2 border-black bg-white px-3 py-1 text-xs font-medium text-black hover:bg-black hover:text-white disabled:opacity-60"
                          >
                            {removing === member.contactNumber ? "Removing..." : "Remove"}
                          </button>
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
