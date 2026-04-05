"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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

type FormState = {
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
};

const emptyForm: FormState = {
  name: "",
  membershipNumber: "",
  contactNumber: "",
  model: "",
  purchaseMonth: "",
  manufacturingYear: "",
  variant: "",
  vehicleColor: "",
  vehicleNumber: "",
  place: "",
  address: "",
  occupation: "",
  mailId: "",
  bloodGroup: "",
  dateOfBirth: "",
  emergencyContact: "",
  suggestions: "",
};

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMembership, setLoadingMembership] = useState(true);

  // Auto-dismiss error popup after 5 seconds
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    async function fetchNextMembership() {
      try {
        const res = await fetch("/api/next-membership");
        const data = await res.json();
        if (data.next) {
          setForm((prev) => ({ ...prev, membershipNumber: String(data.next) }));
        }
      } catch {
        // silently ignore
      } finally {
        setLoadingMembership(false);
      }
    }
    fetchNextMembership();
  }, []);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^[a-zA-Z ]+$/.test(form.name)) {
      setError("Name should only contain letters and spaces.");
      return;
    }
    if (!/^\d{10}$/.test(form.contactNumber)) {
      setError("Contact number must be exactly 10 digits.");
      return;
    }
    if (!/^([A-Za-z]{2}[ -]?[0-9]{1,2}[ -]?[A-Za-z]{0,2}[ -]?[0-9]{4}|[0-9]{2}[ -]?[Bb][Hh][ -]?[0-9]{4}[ -]?[A-Za-z]{1,2})$/.test(form.vehicleNumber)) {
      setError("Invalid vehicle number format (e.g., KL01AB1234 or 21BH1234AA).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "mt-1 block w-full rounded-xl border-2 border-black bg-white px-4 py-3 text-black placeholder-black/40 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition";
  const selectCls = `${inputCls}`;
  const labelCls = "block text-sm font-semibold text-black";

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eff3fb] px-4">
        <div className="w-full max-w-md rounded-3xl border-2 border-black bg-white p-8 text-center shadow-xl">
          {/* Animated checkmark */}
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400 shadow-lg">
            <svg className="h-10 w-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-extrabold text-black">Thank You!</h2>
          <p className="mt-2 text-base font-semibold text-black/80">
            Your registration has been submitted successfully.
          </p>

          <div className="mt-5 rounded-2xl border-2 border-yellow-400 bg-yellow-50 px-5 py-4">
            <p className="text-sm text-black/70 leading-relaxed">
              We have received your details. Our team will review your application and{" "}
              <span className="font-semibold text-black">we will update your membership status soon.</span>
            </p>
          </div>

          <p className="mt-4 text-xs text-black/40">
            For any queries, please contact the admin.
          </p>

          <button
            type="button"
            onClick={async () => {
              setForm(emptyForm);
              setSubmitted(false);
              setLoadingMembership(true);
              try {
                const res = await fetch("/api/next-membership");
                const data = await res.json();
                if (data.next) setForm((prev) => ({ ...prev, membershipNumber: String(data.next) }));
              } finally {
                setLoadingMembership(false);
              }
            }}
            className="mt-6 rounded-xl border-2 border-black bg-white px-6 py-2.5 text-sm font-semibold text-black hover:bg-black hover:text-white transition"
          >
            Register another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eff3fb]">
      <div className="mx-auto max-w-2xl px-0 pb-12 sm:px-4 sm:pt-8">

        {/* Banner card — matches Google Form style */}
        <div className="overflow-hidden rounded-t-2xl border-2 border-black bg-white shadow-md sm:rounded-2xl">
          <div className="relative w-full" style={{ aspectRatio: "16/7" }}>
            <Image
              src="/club-banner.jpg"
              alt="EcoSport TVM Club"
              fill
              className="object-cover object-top"
              priority
              unoptimized
            />
          </div>
          <div className="border-t-4 border-[#4A5FA5] px-6 py-5">
            <h1 className="text-xl font-bold text-black sm:text-2xl">
              Welcome to Ecosport owner&apos;s club Trivandrum
            </h1>
            <p className="mt-0.5 text-sm text-black/50 italic">(TVM/TC/34/2020)</p>
            <p className="mt-3 text-sm font-semibold text-black">Ecostvm member&apos;s joining Form</p>
          </div>
        </div>

        {/* Error popup */}
        {error && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setError(null)}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="relative w-full max-w-sm rounded-2xl border-2 border-black bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mx-auto">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <p className="text-center text-sm font-semibold text-black">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="mt-5 w-full rounded-xl bg-black py-2.5 text-sm font-semibold text-white hover:bg-black/80 transition"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Form card */}
        <div className="mt-4 rounded-b-2xl border-2 border-black bg-white shadow-md sm:rounded-2xl">
        <div className="p-6 sm:p-8">

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Info */}
            <fieldset>
              <legend className="mb-4 border-b-2 border-black pb-2 text-base font-bold uppercase tracking-widest text-black">
                Personal Information
              </legend>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className={labelCls}>Name <span className="text-yellow-600">*</span></label>
                  <input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value.replace(/[^a-zA-Z ]/g, ""))}
                    placeholder="Full name"
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="membershipNumber" className={labelCls}>Membership No</label>
                  <div className="relative mt-1">
                    <input
                      id="membershipNumber"
                      type="text"
                      value={loadingMembership ? "" : form.membershipNumber}
                      readOnly
                      placeholder={loadingMembership ? "Fetching…" : "—"}
                      className="block w-full rounded-xl border-2 border-black/30 bg-gray-50 px-4 py-3 text-black/70 cursor-not-allowed select-none"
                    />
                    {loadingMembership && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="h-4 w-4 animate-spin text-black/40" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      </div>
                    )}
                    {!loadingMembership && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="h-4 w-4 text-black/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-black/40">Auto-assigned — cannot be changed</p>
                </div>
                <div>
                  <label htmlFor="contactNumber" className={labelCls}>Contact No <span className="text-yellow-600">*</span></label>
                  <input
                    id="contactNumber"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.contactNumber}
                    onChange={(e) => updateField("contactNumber", e.target.value.replace(/\D/g, ""))}
                    placeholder="10-digit mobile number"
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="dateOfBirth" className={labelCls}>Date of Birth <span className="text-yellow-600">*</span></label>
                  <input
                    id="dateOfBirth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => updateField("dateOfBirth", e.target.value)}
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="bloodGroup" className={labelCls}>Blood Group</label>
                  <select id="bloodGroup" value={form.bloodGroup} onChange={(e) => updateField("bloodGroup", e.target.value)} className={selectCls}>
                    <option value="">Select blood group</option>
                    {BLOOD_GROUP_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="emergencyContact" className={labelCls}>Emergency Contact</label>
                  <input
                    id="emergencyContact"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.emergencyContact}
                    onChange={(e) => updateField("emergencyContact", e.target.value.replace(/\D/g, ""))}
                    placeholder="Emergency contact number"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="occupation" className={labelCls}>Occupation</label>
                  <input
                    id="occupation"
                    type="text"
                    value={form.occupation}
                    onChange={(e) => updateField("occupation", e.target.value)}
                    placeholder="Your occupation"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="mailId" className={labelCls}>Mail ID</label>
                  <input
                    id="mailId"
                    type="email"
                    value={form.mailId}
                    onChange={(e) => updateField("mailId", e.target.value)}
                    placeholder="your@email.com"
                    className={inputCls}
                  />
                </div>
              </div>
            </fieldset>

            {/* Location */}
            <fieldset>
              <legend className="mb-4 border-b-2 border-black pb-2 text-base font-bold uppercase tracking-widest text-black">
                Location
              </legend>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="place" className={labelCls}>Place <span className="text-yellow-600">*</span></label>
                  <input
                    id="place"
                    type="text"
                    value={form.place}
                    onChange={(e) => updateField("place", e.target.value)}
                    placeholder="City / Town"
                    required
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="address" className={labelCls}>Address <span className="text-yellow-600">*</span></label>
                  <textarea
                    id="address"
                    rows={3}
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="Full address"
                    required
                    className={inputCls}
                  />
                </div>
              </div>
            </fieldset>

            {/* Vehicle Info */}
            <fieldset>
              <legend className="mb-4 border-b-2 border-black pb-2 text-base font-bold uppercase tracking-widest text-black">
                Vehicle Details
              </legend>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Model</label>
                  <div className="mt-2">
                    <ModelPicker value={form.model} onChange={(v) => updateField("model", v)} />
                  </div>
                </div>
                <div>
                  <label htmlFor="purchaseMonth" className={labelCls}>Purchase Month</label>
                  <input
                    id="purchaseMonth"
                    type="text"
                    value={form.purchaseMonth}
                    onChange={(e) => updateField("purchaseMonth", e.target.value)}
                    placeholder="e.g. March 2022"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="manufacturingYear" className={labelCls}>Manufacturing Year</label>
                  <input
                    id="manufacturingYear"
                    type="text"
                    value={form.manufacturingYear}
                    onChange={(e) => updateField("manufacturingYear", e.target.value)}
                    placeholder="e.g. 2022"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="variant" className={labelCls}>Variant</label>
                  <select id="variant" value={form.variant} onChange={(e) => updateField("variant", e.target.value)} className={selectCls}>
                    <option value="">Select variant</option>
                    {VARIANT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="vehicleColor" className={labelCls}>Color of the Vehicle</label>
                  <select id="vehicleColor" value={form.vehicleColor} onChange={(e) => updateField("vehicleColor", e.target.value)} className={selectCls}>
                    <option value="">Select color</option>
                    {COLOR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="vehicleNumber" className={labelCls}>Vehicle No <span className="text-yellow-600">*</span></label>
                  <input
                    id="vehicleNumber"
                    type="text"
                    value={form.vehicleNumber}
                    onChange={(e) => updateField("vehicleNumber", e.target.value.toUpperCase())}
                    placeholder="e.g. KL01AB1234"
                    required
                    className={`${inputCls} uppercase`}
                  />
                </div>
              </div>
            </fieldset>

            {/* Suggestions */}
            <fieldset>
              <legend className="mb-4 border-b-2 border-black pb-2 text-base font-bold uppercase tracking-widest text-black">
                Suggestions
              </legend>
              <div>
                <label htmlFor="suggestions" className={labelCls}>Your Suggestions</label>
                <textarea
                  id="suggestions"
                  rows={4}
                  value={form.suggestions}
                  onChange={(e) => updateField("suggestions", e.target.value)}
                  placeholder="Share any suggestions or feedback..."
                  className={inputCls}
                />
              </div>
            </fieldset>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl bg-yellow-400 px-6 py-3 text-base font-bold text-black shadow-md hover:bg-yellow-300 focus:outline-none focus:ring-4 focus:ring-yellow-300 disabled:opacity-70 transition sm:flex-none"
              >
                {submitting ? "Submitting…" : "Submit Registration"}
              </button>
              <button
                type="button"
                onClick={() => { setForm(emptyForm); setError(null); }}
                className="rounded-xl border-2 border-black bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-black hover:text-white transition"
              >
                Clear form
              </button>
            </div>
          </form>
        </div>
        </div>

        <p className="mt-4 text-center text-xs text-black/40 px-4">
          Fields marked with <span className="text-yellow-600 font-bold">*</span> are required.
        </p>
      </div>
    </div>
  );
}
