"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ModelPicker from "@/app/components/ModelPicker";

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
  source: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type EditForm = Omit<Member, "id" | "isBlocked" | "source" | "createdAt" | "updatedAt">;

const inputCls =
  "mt-1 block w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500";
const selectCls = `${inputCls} bg-white`;
const labelCls = "block text-sm font-medium text-black";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border-2 border-black bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-black/50">{label}</p>
      <p className="mt-1 text-sm font-medium text-black break-words">{value || <span className="text-black/30 font-normal">—</span>}</p>
    </div>
  );
}

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchMember = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/logins/${id}`);
      if (!res.ok) throw new Error("Member not found");
      const data = await res.json();
      setMember(data.member);
      setForm(buildForm(data.member));
    } catch {
      setMessage({ type: "error", text: "Failed to load member." });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  function buildForm(m: Member): EditForm {
    return {
      name: m.name,
      membershipNumber: m.membershipNumber,
      contactNumber: m.contactNumber,
      model: m.model,
      purchaseMonth: m.purchaseMonth,
      manufacturingYear: m.manufacturingYear,
      variant: m.variant,
      vehicleColor: m.vehicleColor,
      vehicleNumber: m.vehicleNumber,
      place: m.place,
      address: m.address,
      occupation: m.occupation,
      mailId: m.mailId,
      bloodGroup: m.bloodGroup,
      dateOfBirth: m.dateOfBirth,
      emergencyContact: m.emergencyContact,
      suggestions: m.suggestions,
    };
  }

  function updateField<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!/^[a-zA-Z ]+$/.test(form.name)) {
      setMessage({ type: "error", text: "Name should only contain letters and spaces." });
      return;
    }
    if (!/^\d{10}$/.test(form.contactNumber)) {
      setMessage({ type: "error", text: "Contact number must be exactly 10 digits." });
      return;
    }
    if (
      !/^([A-Za-z]{2}[ -]?[0-9]{1,2}[ -]?[A-Za-z]{0,2}[ -]?[0-9]{4}|[0-9]{2}[ -]?[Bb][Hh][ -]?[0-9]{4}[ -]?[A-Za-z]{1,2})$/.test(
        form.vehicleNumber
      )
    ) {
      setMessage({ type: "error", text: "Invalid vehicle number format (e.g., KL01AB1234 or 21BH1234AA)." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/logins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, id, mode: "edit" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to save." });
        return;
      }
      setMessage({ type: "success", text: "Member updated successfully." });
      setEditing(false);
      await fetchMember();
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleBlock() {
    if (!member) return;
    try {
      const res = await fetch(`/api/logins/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: !member.isBlocked }),
      });
      if (!res.ok) throw new Error("Failed");
      setMessage({ type: "success", text: member.isBlocked ? "Member unblocked." : "Member blocked." });
      await fetchMember();
    } catch {
      setMessage({ type: "error", text: "Failed to update block status." });
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/logins/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      router.push("/admin/logins");
    } catch {
      setMessage({ type: "error", text: "Failed to delete member." });
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-black/60">Loading member...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <p className="text-sm text-black/60">Member not found.</p>
        <Link href="/admin/logins" className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white">
          ← Back to Members
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b-2 border-black bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/logins"
              className="rounded-lg border-2 border-black bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-black hover:text-white"
            >
              ← Back
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-black">{member.name}</h1>
              <p className="text-sm text-black/60">
                #{member.membershipNumber || "—"}
                {member.isBlocked && (
                  <span className="ml-2 inline-block rounded-full bg-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Blocked
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!editing && (
              <>
                <button
                  type="button"
                  onClick={() => { setEditing(true); setMessage(null); }}
                  className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleToggleBlock}
                  className={`rounded-lg border-2 border-black px-4 py-2 text-sm font-semibold ${
                    member.isBlocked
                      ? "bg-white text-black hover:bg-black hover:text-white"
                      : "bg-black text-white hover:bg-white hover:text-black"
                  }`}
                >
                  {member.isBlocked ? "Unblock" : "Block"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-lg border-2 border-red-600 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-600 hover:text-white"
                >
                  Delete
                </button>
              </>
            )}
            {editing && (
              <button
                type="button"
                onClick={() => { setEditing(false); setForm(buildForm(member)); setMessage(null); }}
                className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6">

          {message && (
            <div
              className={`rounded-lg border-2 border-black p-3 text-sm ${
                message.type === "success" ? "bg-yellow-100 text-black" : "bg-black text-white"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* VIEW MODE */}
          {!editing && (
            <>
              {/* Personal */}
              <section>
                <p className="mb-3 border-b-2 border-black pb-1 text-xs font-bold uppercase tracking-widest text-black">
                  Personal
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Name" value={member.name} />
                  <Field label="Membership No" value={member.membershipNumber} />
                  <Field label="Contact No" value={member.contactNumber} />
                  <Field label="Date of Birth" value={member.dateOfBirth} />
                  <Field label="Blood Group" value={member.bloodGroup} />
                  <Field label="Emergency Contact" value={member.emergencyContact} />
                  <Field label="Occupation" value={member.occupation} />
                  <Field label="Mail ID" value={member.mailId} />
                </div>
              </section>

              {/* Location */}
              <section>
                <p className="mb-3 border-b-2 border-black pb-1 text-xs font-bold uppercase tracking-widest text-black">
                  Location
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Place" value={member.place} />
                  <Field label="Address" value={member.address} />
                </div>
              </section>

              {/* Vehicle */}
              <section>
                <p className="mb-3 border-b-2 border-black pb-1 text-xs font-bold uppercase tracking-widest text-black">
                  Vehicle
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Model" value={member.model} />
                  <Field label="Purchase Month" value={member.purchaseMonth} />
                  <Field label="Manufacturing Year" value={member.manufacturingYear} />
                  <Field label="Variant" value={member.variant} />
                  <Field label="Color" value={member.vehicleColor} />
                  <Field label="Vehicle No" value={member.vehicleNumber} />
                </div>
              </section>

              {/* Suggestions */}
              {member.suggestions && (
                <section>
                  <p className="mb-3 border-b-2 border-black pb-1 text-xs font-bold uppercase tracking-widest text-black">
                    Suggestions
                  </p>
                  <div className="rounded-xl border-2 border-black bg-white p-4">
                    <p className="text-sm text-black whitespace-pre-wrap">{member.suggestions}</p>
                  </div>
                </section>
              )}

              {/* Meta */}
              <section>
                <p className="mb-3 border-b-2 border-black pb-1 text-xs font-bold uppercase tracking-widest text-black">
                  Record Info
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Source" value={member.source} />
                  <Field label="Created At" value={member.createdAt ? new Date(member.createdAt).toLocaleString() : undefined} />
                  <Field label="Last Updated" value={member.updatedAt ? new Date(member.updatedAt).toLocaleString() : undefined} />
                </div>
              </section>
            </>
          )}

          {/* EDIT MODE */}
          {editing && form && (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Personal */}
              <section>
                <p className="mb-3 border-b-2 border-black pb-1 text-xs font-bold uppercase tracking-widest text-black">Personal</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>Name *</label>
                    <input
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value.replace(/[^a-zA-Z ]/g, ""))}
                      required
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Membership No</label>
                    <input
                      value={form.membershipNumber}
                      onChange={(e) => updateField("membershipNumber", e.target.value.replace(/\D/g, ""))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Contact No *</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={form.contactNumber}
                      onChange={(e) => updateField("contactNumber", e.target.value.replace(/\D/g, ""))}
                      required
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Date of Birth *</label>
                    <input
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) => updateField("dateOfBirth", e.target.value)}
                      required
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Blood Group</label>
                    <select value={form.bloodGroup} onChange={(e) => updateField("bloodGroup", e.target.value)} className={selectCls}>
                      <option value="">Select</option>
                      {BLOOD_GROUP_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Emergency Contact</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={form.emergencyContact}
                      onChange={(e) => updateField("emergencyContact", e.target.value.replace(/\D/g, ""))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Occupation</label>
                    <input value={form.occupation} onChange={(e) => updateField("occupation", e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Mail ID</label>
                    <input type="email" value={form.mailId} onChange={(e) => updateField("mailId", e.target.value)} className={inputCls} />
                  </div>
                </div>
              </section>

              {/* Location */}
              <section>
                <p className="mb-3 border-b-2 border-black pb-1 text-xs font-bold uppercase tracking-widest text-black">Location</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>Place *</label>
                    <input value={form.place} onChange={(e) => updateField("place", e.target.value)} required className={inputCls} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Address *</label>
                    <textarea rows={2} value={form.address} onChange={(e) => updateField("address", e.target.value)} required className={inputCls} />
                  </div>
                </div>
              </section>

              {/* Vehicle */}
              <section>
                <p className="mb-3 border-b-2 border-black pb-1 text-xs font-bold uppercase tracking-widest text-black">Vehicle</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className={labelCls}>Model</label>
                    <div className="mt-2">
                      <ModelPicker value={form.model} onChange={(v) => updateField("model", v)} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Purchase Month</label>
                    <input value={form.purchaseMonth} onChange={(e) => updateField("purchaseMonth", e.target.value)} placeholder="e.g. March 2022" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Manufacturing Year</label>
                    <input value={form.manufacturingYear} onChange={(e) => updateField("manufacturingYear", e.target.value)} placeholder="e.g. 2022" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Variant</label>
                    <select value={form.variant} onChange={(e) => updateField("variant", e.target.value)} className={selectCls}>
                      <option value="">Select</option>
                      {VARIANT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Color of the Vehicle</label>
                    <select value={form.vehicleColor} onChange={(e) => updateField("vehicleColor", e.target.value)} className={selectCls}>
                      <option value="">Select</option>
                      {COLOR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Vehicle No *</label>
                    <input
                      value={form.vehicleNumber}
                      onChange={(e) => updateField("vehicleNumber", e.target.value.toUpperCase())}
                      required
                      className={`${inputCls} uppercase`}
                    />
                  </div>
                </div>
              </section>

              {/* Suggestions */}
              <section>
                <p className="mb-3 border-b-2 border-black pb-1 text-xs font-bold uppercase tracking-widest text-black">Suggestions</p>
                <textarea rows={3} value={form.suggestions} onChange={(e) => updateField("suggestions", e.target.value)} className={inputCls} />
              </section>

              <div className="flex flex-wrap gap-3 pt-2">
                <button type="submit" disabled={saving} className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-70">
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditing(false); setForm(buildForm(member)); setMessage(null); }}
                  className="rounded-lg border-2 border-black bg-white px-5 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border-2 border-black bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-black">Delete member?</h2>
            <p className="mt-2 text-sm text-black/70">
              This will permanently remove <strong>{member.name}</strong> from the system. This action cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-70"
              >
                {deleting ? "Deleting..." : "Yes, delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
