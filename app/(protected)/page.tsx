"use client";

import { useState, useRef, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

type FeedbackType = "Appreciation" | "Escalation" | "";

const TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: "", label: "Select feedback type" },
  { value: "Appreciation", label: "Appreciation" },
  { value: "Escalation", label: "Escalation" },
];

export default function FeedbackPage() {
  const [name, setName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [type, setType] = useState<FeedbackType>("");
  const [heading, setHeading] = useState("");
  const [detailedDescription, setDetailedDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [typeOpen, setTypeOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setTypeOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setTypeOpen(false);
    }
    if (typeOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [typeOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type) {
      setMessage({ type: "error", text: "Please select a feedback type." });
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
          vehicleNumber,
          type,
          heading,
          detailedDescription,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to submit feedback." });
        return;
      }
      setMessage({ type: "success", text: "Thank you! Your feedback has been submitted." });
      setName("");
      setVehicleNumber("");
      setType("");
      setHeading("");
      setDetailedDescription("");
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
              Vehicle Feedback
            </h1>
            <p className="mt-2 text-sm text-black/80">
              Share your appreciation or escalations with the club. We&apos;re here to listen.
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
              <label htmlFor="vehicleNumber" className="block text-sm font-medium text-black">
                Vehicle Number
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
            <div ref={typeDropdownRef} className="relative">
              <label id="type-label" className="block text-sm font-medium text-black">
                Type
              </label>
              <input type="hidden" name="type" value={type} required />
              <button
                type="button"
                id="type"
                aria-haspopup="listbox"
                aria-expanded={typeOpen}
                aria-labelledby="type-label"
                aria-required
                onClick={() => setTypeOpen((o) => !o)}
                onFocus={() => setTypeOpen(true)}
                className="mt-1 flex w-full items-center justify-between rounded-lg border-2 border-black bg-white px-3 py-2.5 text-left text-black transition-colors placeholder:text-black/50 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-0 hover:border-black/80"
              >
                <span className={type ? "" : "text-black/50"}>
                  {TYPE_OPTIONS.find((o) => o.value === type)?.label ?? "Select feedback type"}
                </span>
                <svg
                  className={`h-4 w-4 shrink-0 text-black transition-transform ${typeOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {typeOpen && (
                <ul
                  role="listbox"
                  aria-labelledby="type-label"
                  className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border-2 border-black bg-white py-1 shadow-lg"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <li
                      key={opt.value || "placeholder"}
                      role="option"
                      aria-selected={type === opt.value}
                      onClick={() => {
                        setType(opt.value);
                        setTypeOpen(false);
                      }}
                      className={`cursor-pointer px-3 py-2.5 text-sm transition-colors ${
                        type === opt.value
                          ? "bg-yellow-400 font-medium text-black"
                          : "text-black hover:bg-yellow-100"
                      } ${!opt.value ? "text-black/50" : ""}`}
                    >
                      {opt.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label htmlFor="heading" className="block text-sm font-medium text-black">
                Heading
              </label>
              <input
                id="heading"
                type="text"
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                placeholder="Short summary of your feedback"
                className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2.5 text-black placeholder:text-black/50 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label htmlFor="detailedDescription" className="block text-sm font-medium text-black">
                Detailed Description
              </label>
              <textarea
                id="detailedDescription"
                rows={4}
                value={detailedDescription}
                onChange={(e) => setDetailedDescription(e.target.value)}
                placeholder="Provide details about your appreciation or escalation..."
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
    </div>
  );
}
