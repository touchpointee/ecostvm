"use client";

import { useState } from "react";

type Props = {
  feedbackId: string;
};

type Phase = "idle" | "submitting" | "submitted" | "error";

export default function ReviewForm({ feedbackId }: Props) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorText, setErrorText] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;

    setPhase("submitting");
    setErrorText("");

    try {
      const res = await fetch(`/api/feedback/${feedbackId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorText(data.error ?? "Failed to submit review.");
        setPhase("error");
        return;
      }
      setPhase("submitted");
    } catch {
      setErrorText("Something went wrong. Please try again.");
      setPhase("error");
    }
  }

  if (phase === "submitted") {
    return (
      <div className="mt-6 rounded-2xl border-2 border-black bg-yellow-50 p-6 text-center">
        <div className="text-4xl">🙏</div>
        <h2 className="mt-3 text-lg font-bold text-black">
          Thank you for your review!
        </h2>
        <p className="mt-1 text-sm text-black/70">
          Your feedback helps us improve our service.
        </p>
      </div>
    );
  }

  const activeRating = hovered || rating;

  return (
    <div className="mt-6 rounded-2xl border-2 border-black bg-white p-6">
      <h2 className="text-base font-bold text-black">
        Rate your service experience
      </h2>
      <p className="mt-1 text-sm text-black/60">
        How satisfied are you with the resolution?
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        {/* Star rating */}
        <div>
          <div
            className="flex gap-2"
            onMouseLeave={() => setHovered(0)}
            aria-label="Star rating"
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
                onClick={() => setRating(star)}
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
            <p className="mt-1 text-xs text-black/50">
              {
                ["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating]
              }
            </p>
          )}
        </div>

        {/* Comment */}
        <div>
          <label
            htmlFor="review-comment"
            className="block text-sm font-medium text-black"
          >
            Comment{" "}
            <span className="text-black/40 font-normal">(optional)</span>
          </label>
          <textarea
            id="review-comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us about your experience…"
            maxLength={500}
            className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2.5 text-sm text-black placeholder:text-black/40 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>

        {phase === "error" && (
          <p className="rounded-lg border-2 border-black bg-black px-3 py-2 text-sm text-white">
            {errorText}
          </p>
        )}

        <button
          type="submit"
          disabled={rating === 0 || phase === "submitting"}
          className="w-full rounded-full bg-yellow-400 py-3 text-sm font-semibold text-black shadow hover:bg-yellow-300 disabled:opacity-50"
        >
          {phase === "submitting" ? "Submitting…" : "Submit Review"}
        </button>
      </form>
    </div>
  );
}
