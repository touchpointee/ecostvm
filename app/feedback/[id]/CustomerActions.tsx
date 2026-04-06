"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Phase = "idle" | "expanded" | "submitting" | "done" | "error";

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export default function CustomerActions({
  feedbackId,
  token,
  resolvedByCustomer,
}: {
  feedbackId: string;
  token: string;
  resolvedByCustomer: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(resolvedByCustomer ? "done" : "idle");
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [errorText, setErrorText] = useState("");

  async function handleSubmit() {
    setPhase("submitting");
    setErrorText("");
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          rating: rating > 0 ? rating : undefined,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorText(data.error ?? "Failed to submit. Please try again.");
        setPhase("expanded");
        return;
      }
      setPhase("done");
      // Refresh the server component so the status card updates to "Resolved"
      router.refresh();
    } catch {
      setErrorText("Something went wrong. Please try again.");
      setPhase("expanded");
    }
  }

  if (phase === "done") {
    return (
      <div className="rounded-2xl border-2 border-black bg-green-50 p-6 text-center">
        <div className="text-4xl">✅</div>
        <h2 className="mt-3 text-base font-bold text-green-800">
          Issue marked as resolved
        </h2>
        <p className="mt-1 text-sm text-green-700/80">
          Thank you for letting us know!
        </p>
      </div>
    );
  }

  if (phase === "idle") {
    return (
      <div className="rounded-2xl border-2 border-black bg-white p-5">
        <p className="text-sm font-semibold text-black">Is this issue resolved?</p>
        <p className="mt-1 text-sm text-black/60">
          Let us know if your concern has been addressed by our team.
        </p>
        <button
          type="button"
          onClick={() => setPhase("expanded")}
          className="mt-4 rounded-full bg-yellow-400 px-6 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
        >
          Mark as Resolved
        </button>
      </div>
    );
  }

  const activeRating = hovered || rating;

  return (
    <div className="rounded-2xl border-2 border-black bg-white p-6">
      <h2 className="text-base font-bold text-black">Mark as Resolved</h2>
      <p className="mt-1 text-sm text-black/60">
        Optionally share your experience before confirming.
      </p>

      <div className="mt-5 space-y-5">
        {/* Star rating (optional) */}
        <div>
          <p className="text-sm font-medium text-black">
            Rating{" "}
            <span className="font-normal text-black/40">(optional)</span>
          </p>
          <div
            className="mt-2 flex gap-2"
            onMouseLeave={() => setHovered(0)}
            aria-label="Star rating"
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
                onClick={() => setRating(star === rating ? 0 : star)}
                onMouseEnter={() => setHovered(star)}
                className="text-3xl transition-transform hover:scale-110 focus:outline-none"
              >
                <span
                  className={
                    star <= activeRating ? "text-yellow-400" : "text-black/20"
                  }
                >
                  ★
                </span>
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="mt-1 text-xs text-black/50">{STAR_LABELS[rating]}</p>
          )}
        </div>

        {/* Comment (optional) */}
        <div>
          <label
            htmlFor="resolve-comment"
            className="block text-sm font-medium text-black"
          >
            Comment{" "}
            <span className="font-normal text-black/40">(optional)</span>
          </label>
          <textarea
            id="resolve-comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us about your experience…"
            maxLength={500}
            className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2.5 text-sm text-black placeholder:text-black/40 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>

        {errorText && (
          <p className="rounded-lg border-2 border-black bg-black px-3 py-2 text-sm text-white">
            {errorText}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={phase === "submitting"}
            className="flex-1 rounded-full bg-yellow-400 py-3 text-sm font-semibold text-black hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {phase === "submitting" ? "Submitting…" : "Confirm Resolved"}
          </button>
          <button
            type="button"
            onClick={() => {
              setRating(0);
              setComment("");
              setErrorText("");
              setPhase("idle");
            }}
            disabled={phase === "submitting"}
            className="rounded-full border-2 border-black px-5 py-3 text-sm font-semibold text-black hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
