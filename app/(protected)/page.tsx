"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function FeedbackPage() {
  const [name, setName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [advisor, setAdvisor] = useState("");
  const [pickupDrop, setPickupDrop] = useState("");
  const [concerns, setConcerns] = useState("");
  const [type, setType] = useState<"" | "Appreciation" | "Escalation">("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [submittedCode, setSubmittedCode] = useState("");
  const [autofillValues, setAutofillValues] = useState({
    name: "",
    contactNumber: "",
    vehicleNumber: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadMemberProfile() {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data.member || cancelled) return;

        const nextValues = {
          name: data.member.name ?? "",
          contactNumber: (data.member.contactNumber ?? data.phoneNumber ?? "").replace(/\\D/g, '').slice(-10),
          vehicleNumber: data.member.vehicleNumber ?? "",
        };

        setAutofillValues(nextValues);
        setName(nextValues.name);
        setContactNumber(nextValues.contactNumber);
        setVehicleNumber(nextValues.vehicleNumber);
      } catch {
        // Keep the form usable even if autofill fails.
      }
    }

    loadMemberProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      setMessage({ type: "error", text: "Name should only contain letters and spaces." });
      return;
    }
    if (!/^\d{10}$/.test(contactNumber)) {
      setMessage({ type: "error", text: "Contact number must be exactly 10 digits." });
      return;
    }
    if (!/^[A-Za-z]{2}[ -]?[0-9]{1,2}[ -]?[A-Za-z]{0,2}[ -]?[0-9]{4}$/.test(vehicleNumber) && !/^[0-9]{2}[ -]?[Bb][Hh][ -]?[0-9]{4}[ -]?[A-Za-z]{1,2}$/.test(vehicleNumber)) {
      setMessage({ type: "error", text: "Invalid vehicle number format (e.g., KL01AB1234 or 21BH1234AA)." });
      return;
    }
    if (!advisor || !pickupDrop || !serviceDate) {
      setMessage({ type: "error", text: "Please fill in all required fields." });
      return;
    }
    if (!type) {
      setMessage({ type: "error", text: "Please select feedback group (Appreciation / Escalation)." });
      return;
    }

    const maxDate = new Date().toISOString().split('T')[0];
    if (serviceDate > maxDate) {
      setMessage({ type: "error", text: "Service date cannot be in the future." });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contactNumber,
          vehicleNumber,
          serviceDate,
          advisor,
          pickupDrop,
          concerns,
          type,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to submit feedback." });
        return;
      }
      setSubmittedCode(data.trackingCode ?? "");
      setMessage({ type: "success", text: "Thank you! Your feedback has been submitted." });
      setSuccessModalOpen(true);
      setName(autofillValues.name);
      setContactNumber(autofillValues.contactNumber);
      setVehicleNumber(autofillValues.vehicleNumber);
      setServiceDate("");
      setAdvisor("");
      setPickupDrop("");
      setConcerns("");
      setType("");
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#eff3fb]">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-0 pb-12 sm:px-4 sm:pt-8">

        {/* Banner */}
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
            <p className="mt-3 text-sm font-semibold text-black">Service Feedback</p>
          </div>
        </div>

        <div className="w-full rounded-b-2xl border-x-2 border-b-2 border-black bg-white p-6 shadow-lg sm:rounded-2xl sm:border-t-2 sm:mt-5 sm:p-8">
          <div className="border-b-2 border-black pb-6">
            <p className="text-sm text-black/80">
              Share feedback or concerns about your recent service so the team can assist you.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-black">
                Name
              </label>
              <input
                id="name"
                type="text"
                pattern="[a-zA-Z ]+"
                title="Name should only contain letters and spaces"
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z ]/g, ''))}
                placeholder="Your name"
                className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2.5 text-black placeholder:text-black/50 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
            </div>
            <div>
              <label htmlFor="contactNumber" className="block text-sm font-medium text-black">
                Contact no
              </label>
              <input
                id="contactNumber"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                title="Contact number must be exactly 10 digits"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value.replace(/\\D/g, ''))}
                placeholder="Your phone number"
                className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2.5 text-black placeholder:text-black/50 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
            </div>
            <div>
              <label htmlFor="vehicleNumber" className="block text-sm font-medium text-black">
                Vehicle number
              </label>
              <input
                id="vehicleNumber"
                type="text"
                pattern="^([A-Za-z]{2}[ -]?[0-9]{1,2}[ -]?[A-Za-z]{0,2}[ -]?[0-9]{4}|[0-9]{2}[ -]?[Bb][Hh][ -]?[0-9]{4}[ -]?[A-Za-z]{1,2})$"
                title="Valid format: KL01AB1234 or 21BH1234AA"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="Vehicle registration number"
                className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2.5 text-black placeholder:text-black/50 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 uppercase"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="serviceDate" className="block text-sm font-medium text-black">
                  Service date
                </label>
                <input
                  id="serviceDate"
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2.5 text-black placeholder:text-black/50 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="advisor" className="block text-sm font-medium text-black">
                  Advisor
                </label>
                <input
                  id="advisor"
                  type="text"
                  value={advisor}
                  onChange={(e) => setAdvisor(e.target.value)}
                  placeholder="Service advisor name"
                  className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2.5 text-black placeholder:text-black/50 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-black">
                Feedback group
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as "Appreciation" | "Escalation" | "")}
                className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2.5 text-black focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              >
                <option value="">Select group</option>
                <option value="Appreciation">Appreciation</option>
                <option value="Escalation">Escalation</option>
              </select>
            </div>
            <div>
              <label htmlFor="pickupDrop" className="block text-sm font-medium text-black">
                Pickup / drop
              </label>
              <select
                id="pickupDrop"
                value={pickupDrop}
                onChange={(e) => setPickupDrop(e.target.value)}
                className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2.5 text-black focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              >
                <option value="">Select option</option>
                <option value="Pickup">Pickup</option>
                <option value="Drop">Drop</option>
                <option value="Pickup & Drop">Pickup & Drop</option>
                <option value="Drive in">Drive in</option>
              </select>
            </div>
            <div>
              <label htmlFor="concerns" className="block text-sm font-medium text-black">
                Service feedback / concerns
              </label>
              <textarea
                id="concerns"
                rows={4}
                value={concerns}
                onChange={(e) => setConcerns(e.target.value)}
                placeholder="Describe your service experience, issues, or concerns..."
                className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2.5 text-black placeholder:text-black/50 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
            </div>
            {message && (
              <p
                className={`text-sm ${
                  message.type === "success" ? "text-yellow-600" : "text-black"
                }`}
              >
                {message.text}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-yellow-400 px-4 py-3 font-semibold text-black shadow-md hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-70"
            >
              {submitting ? "Submitting..." : "Submit Feedback"}
            </button>
          </form>
        </div>
      </main>
      <Footer />

      {successModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSuccessModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-success-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border-2 border-black bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-4xl">🙏</div>
              <h2 id="feedback-success-title" className="mt-3 text-xl font-bold text-black">
                Feedback Submitted!
              </h2>
              <p className="mt-1 text-sm text-black/70">
                Your concern has been recorded successfully.
              </p>
            </div>

            {submittedCode && (
              <div className="mt-5 rounded-xl border-2 border-black bg-yellow-50 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-black/50">
                  Your Reference Code
                </p>
                <p className="mt-2 text-4xl font-bold tracking-[0.3em] text-black">
                  {submittedCode}
                </p>
                <p className="mt-2 text-xs text-black/50">
                  Save this code to track your feedback
                </p>
              </div>
            )}

            <p className="mt-4 text-center text-xs text-black/50">
              A tracking link has been sent to your WhatsApp.
            </p>

            <button
              type="button"
              onClick={() => setSuccessModalOpen(false)}
              className="mt-5 w-full rounded-full bg-yellow-400 px-4 py-3 font-semibold text-black hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
