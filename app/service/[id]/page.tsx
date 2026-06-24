import Image from "next/image";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";

export default async function ServiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }> | { id: string };
  searchParams: Promise<{ token?: string }> | { token?: string };
}) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearch = await Promise.resolve(searchParams);
  const id = String(resolvedParams.id ?? "").trim();
  const token = String(resolvedSearch?.token ?? "").trim();

  if (!ObjectId.isValid(id)) {
    return (
      <ErrorPage
        title="Invalid link"
        message="The service request ID in this link is not valid."
      />
    );
  }

  const db = await getDb();
  const service = await db
    .collection("services")
    .findOne({ _id: new ObjectId(id) });

  if (!service) {
    return (
      <ErrorPage
        title="Service request not found"
        message="This service booking request does not exist or may have been removed."
      />
    );
  }

  // Access validation: token must match trackingCode
  const isAuthorized = token.length > 0 && token === String(service.trackingCode ?? "");
  if (!isAuthorized) {
    return (
      <ErrorPage
        title="Access Denied"
        message="You do not have permission to view this service booking request. Please check your tracking link."
      />
    );
  }

  const fields = [
    { label: "Customer Name", value: service.name ?? "-" },
    { label: "Contact number", value: service.contactNumber ?? "-" },
    { label: "Vehicle registration number", value: service.vehicleNumber ?? "-" },
    { label: "Preferred appointment date", value: service.appointmentDate ?? "-" },
    { label: "Odometer Reading", value: service.odometer != null ? `${service.odometer} KMs` : "-" },
    { label: "Advisor", value: service.advisor ?? "-" },
    { label: "Types of service required", value: service.types ? service.types.join(", ") : "-" },
    {
      label: "Registered on",
      value: service.createdAt
        ? new Date(service.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "-",
    },
  ];

  return (
    <div className="min-h-screen bg-[#eff3fb] px-0 pb-10 sm:px-4 sm:pt-8">
      <div className="mx-auto max-w-2xl space-y-5">
        {/* Banner */}
        <div className="overflow-hidden rounded-t-2xl border-2 border-black bg-white shadow-md sm:rounded-2xl">
          <div className="relative w-full" style={{ aspectRatio: "16/7" }}>
            <Image
              src="/club-banner.jpg"
              alt="ECOSTVM"
              fill
              className="object-cover object-top"
              priority
              unoptimized
            />
          </div>
          <div className="border-t-4 border-[#4A5FA5] px-6 py-5">
            <h1 className="text-xl font-bold text-black sm:text-2xl">
              Welcome to ECOSTVM
            </h1>
            <p className="mt-0.5 text-sm text-black/50 italic">(TVM/TC/34/2020)</p>
            <p className="mt-3 text-sm font-semibold text-black">Service Request details</p>
          </div>
        </div>

        {/* Remarks card */}
        {service.remarks && (
          <div className="rounded-2xl border-2 border-black bg-yellow-50 p-5 shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/50">
              Additional Remarks / Specific Concerns
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-black">
              {String(service.remarks)}
            </p>
          </div>
        )}

        {/* Detail grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div
              key={field.label}
              className="rounded-xl border-2 border-black bg-white p-4 shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-black/50">
                {field.label}
              </p>
              <p className="mt-1.5 text-sm text-black font-semibold">
                {String(field.value)}
              </p>
            </div>
          ))}
        </div>
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
    <div className="min-h-screen bg-[#eff3fb] px-4 py-12">
      <div className="mx-auto max-w-2xl rounded-2xl border-2 border-black bg-white p-8 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-500">
          ECOSTVM
        </p>
        <h1 className="mt-2 text-2xl font-bold text-black">{title}</h1>
        <p className="mt-2 text-sm text-black/70">{message}</p>
      </div>
    </div>
  );
}
