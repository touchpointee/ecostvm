"use client";

import { useState } from "react";
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type) {
      setMessage({ type: "error", text: "Please select feedback group (Appreciation / Escalation)." });
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
      setMessage({ type: "success", text: "Thank you! Your feedback has been submitted." });
      setSuccessModalOpen(true);
      setName("");
      setContactNumber("");
      setVehicleNumber("");
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
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-3xl flex-1 items-start justify-center bg-white px-4 py-12 sm:px-6">
        <div className="w-full rounded-2xl border-2 border-black bg-white p-6 shadow-lg sm:p-8">
          <div className="border-b-2 border-black pb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-500">
              EcoSport Owner&apos;s Club Trivandrum
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-black sm:text-3xl">
              Service Feedback
            </h1>
            <p className="mt-2 text-sm text-black/80">
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
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                inputMode="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
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
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="Vehicle registration number"
                className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2.5 text-black placeholder:text-black/50 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
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
                <option value="Appreciation">Appreciation group</option>
                <option value="Escalation">Escalation group</option>
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
            <h2 id="feedback-success-title" className="text-xl font-semibold text-black">
              Thank you!
            </h2>
            <p className="mt-2 text-sm text-black/80">
              Your feedback has been submitted.
            </p>
            <button
              type="button"
              onClick={() => setSuccessModalOpen(false)}
              className="mt-6 w-full rounded-full bg-yellow-400 px-4 py-3 font-semibold text-black hover:bg-yellow-300"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
