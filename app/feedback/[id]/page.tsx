import Link from "next/link";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await Promise.resolve(params);
  const id = String(resolvedParams.id ?? "").trim();

  if (!ObjectId.isValid(id)) {
    return (
      <div className="min-h-screen bg-white px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border-2 border-black bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-black">Invalid feedback link</h1>
          <p className="mt-2 text-sm text-black/70">The feedback ID in this link is not valid.</p>
        </div>
      </div>
    );
  }

  const db = await getDb();
  const feedback = await db.collection("feedback").findOne({ _id: new ObjectId(id) });

  if (!feedback) {
    return (
      <div className="min-h-screen bg-white px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border-2 border-black bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-black">Feedback not found</h1>
          <p className="mt-2 text-sm text-black/70">This feedback record does not exist or may have been removed.</p>
        </div>
      </div>
    );
  }

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
      value: feedback.createdAt ? new Date(feedback.createdAt).toLocaleString() : "-",
    },
  ];

  return (
    <div className="min-h-screen bg-white px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-4xl rounded-2xl border-2 border-black bg-white p-6 shadow-lg sm:p-8">
        <div className="border-b-2 border-black pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-500">
            EcoSport TVM
          </p>
          <h1 className="mt-2 text-2xl font-bold text-black sm:text-3xl">Feedback Details</h1>
          <p className="mt-2 text-sm text-black/80">
            Full service feedback shared from the WhatsApp notification.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.label} className="rounded-xl border-2 border-black bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-black/60">{field.label}</p>
              <p className="mt-2 text-sm text-black">{String(field.value)}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border-2 border-black bg-yellow-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/60">Service feedback / concerns</p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-black">
            {String(feedback.concerns ?? "-")}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300"
          >
            Back to admin
          </Link>
        </div>
      </div>
    </div>
  );
}
