import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";
import ReviewForm from "./ReviewForm";

type FeedbackStatus = "Open" | "In Progress" | "Resolved" | "Closed";

const STATUS_META: Record<
  FeedbackStatus,
  { label: string; bg: string; text: string; dot: string; description: string }
> = {
  Open: {
    label: "Open",
    bg: "bg-white",
    text: "text-black",
    dot: "bg-black/30",
    description: "Your feedback has been received and is queued for review.",
  },
  "In Progress": {
    label: "In Progress",
    bg: "bg-yellow-50",
    text: "text-yellow-800",
    dot: "bg-yellow-400",
    description: "Our team is actively working on your concern.",
  },
  Resolved: {
    label: "Resolved",
    bg: "bg-green-50",
    text: "text-green-800",
    dot: "bg-green-500",
    description: "Your concern has been resolved. Please rate your experience.",
  },
  Closed: {
    label: "Closed",
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-400",
    description: "This feedback has been closed.",
  },
};

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await Promise.resolve(params);
  const id = String(resolvedParams.id ?? "").trim();

  if (!ObjectId.isValid(id)) {
    return <ErrorPage title="Invalid link" message="The feedback ID in this link is not valid." />;
  }

  const db = await getDb();
  const feedback = await db
    .collection("feedback")
    .findOne({ _id: new ObjectId(id) });

  if (!feedback) {
    return (
      <ErrorPage
        title="Feedback not found"
        message="This feedback record does not exist or may have been removed."
      />
    );
  }

  const status = (feedback.status ?? "Open") as FeedbackStatus;
  const meta = STATUS_META[status] ?? STATUS_META["Open"];
  const review = feedback.review as {
    rating: number;
    comment: string;
    submittedAt: Date;
  } | null;

  const fields = [
    { label: "Name", value: feedback.name ?? "-" },
    { label: "Contact no", value: feedback.contactNumber ?? "-" },
    { label: "Vehicle number", value: feedback.vehicleNumber ?? "-" },
    { label: "Service date", value: feedback.serviceDate ?? "-" },
    { label: "Advisor", value: feedback.advisor ?? "-" },
    { label: "Pickup / drop", value: feedback.pickupDrop ?? "-" },
    { label: "Feedback type", value: feedback.type ?? "-" },
    {
      label: "Submitted on",
      value: feedback.createdAt
        ? new Date(feedback.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "-",
    },
  ];

  return (
    <div className="min-h-screen bg-white px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* Header */}
        <div className="rounded-2xl border-2 border-black bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-500">
            EcoSport TVM
          </p>
          <h1 className="mt-1 text-2xl font-bold text-black">
            Service Feedback
          </h1>
          <p className="mt-1 text-sm text-black/60">
            View your feedback details, current status, and submit a review.
          </p>
        </div>

        {/* Status card */}
        <div
          className={`rounded-2xl border-2 border-black p-5 ${meta.bg}`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${meta.dot}`}
            />
            <span className={`text-sm font-bold ${meta.text}`}>
              {meta.label}
            </span>
          </div>
          <p className={`mt-1 text-sm ${meta.text} opacity-80`}>
            {meta.description}
          </p>
        </div>

        {/* Concerns */}
        <div className="rounded-2xl border-2 border-black bg-yellow-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/50">
            Service feedback / concerns
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-black">
            {String(feedback.concerns ?? "-")}
          </p>
        </div>

        {/* Detail grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div
              key={field.label}
              className="rounded-xl border-2 border-black bg-white p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-black/50">
                {field.label}
              </p>
              <p className="mt-1.5 text-sm text-black">
                {String(field.value)}
              </p>
            </div>
          ))}
        </div>

        {/* Review section */}
        {review ? (
          <div className="rounded-2xl border-2 border-black bg-white p-6">
            <h2 className="text-base font-bold text-black">Your review</h2>
            <div className="mt-3 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-2xl ${
                    star <= review.rating
                      ? "text-yellow-400"
                      : "text-black/15"
                  }`}
                >
                  ★
                </span>
              ))}
              <span className="ml-2 text-sm font-medium text-black">
                {STAR_LABELS[review.rating]}
              </span>
            </div>
            {review.comment && (
              <p className="mt-3 text-sm text-black/80">{review.comment}</p>
            )}
            <p className="mt-3 text-xs text-black/40">
              Submitted on{" "}
              {new Date(review.submittedAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        ) : (
          <ReviewForm feedbackId={id} />
        )}
      </div>
    </div>
  );
}

function ErrorPage({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="min-h-screen bg-white px-4 py-12">
      <div className="mx-auto max-w-2xl rounded-2xl border-2 border-black bg-white p-8 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-500">
          EcoSport TVM
        </p>
        <h1 className="mt-2 text-2xl font-bold text-black">{title}</h1>
        <p className="mt-2 text-sm text-black/70">{message}</p>
      </div>
    </div>
  );
}
