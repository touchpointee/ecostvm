"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ServiceItem = {
  id: string;
  name: string;
  contactNumber: string;
  vehicleNumber: string;
  appointmentDate: string;
  odometer: number;
  types: string[];
  remarks: string;
  createdAt: string | null;
  whatsappSent: boolean;
  whatsappError: string | null;
  customerWhatsappSent: boolean;
  customerWhatsappError: string | null;
  attempts: number;
};

export default function AdminServicesPage() {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Filter states
  const [nameFilter, setNameFilter] = useState("");
  const [contactFilter, setContactFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [appointmentDateFilter, setAppointmentDateFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [groupWaFilter, setGroupWaFilter] = useState<"" | "true" | "false">("");
  const [customerWaFilter, setCustomerWaFilter] = useState<"" | "true" | "false">("");

  function getCurrentFilters() {
    return {
      name: nameFilter,
      contactNumber: contactFilter,
      vehicleNumber: vehicleFilter,
      appointmentDate: appointmentDateFilter,
      serviceType: typeFilter,
      whatsappSent: groupWaFilter,
      customerWhatsappSent: customerWaFilter,
    };
  }

  function buildFilterParams() {
    const params = new URLSearchParams();
    const filters = getCurrentFilters();
    if (filters.name.trim()) params.set("name", filters.name.trim());
    if (filters.contactNumber.trim()) params.set("contactNumber", filters.contactNumber.trim());
    if (filters.vehicleNumber.trim()) params.set("vehicleNumber", filters.vehicleNumber.trim());
    if (filters.appointmentDate.trim()) params.set("appointmentDate", filters.appointmentDate.trim());
    if (filters.serviceType.trim()) params.set("serviceType", filters.serviceType.trim());
    if (filters.whatsappSent) params.set("whatsappSent", filters.whatsappSent);
    if (filters.customerWhatsappSent) params.set("customerWhatsappSent", filters.customerWhatsappSent);
    return params;
  }

  const fetchItems = useCallback(
    async (filters?: {
      name?: string;
      contactNumber?: string;
      vehicleNumber?: string;
      appointmentDate?: string;
      serviceType?: string;
      whatsappSent?: string;
      customerWhatsappSent?: string;
    }) => {
      setLoading(true);
      setMessage(null);
      try {
        const params = new URLSearchParams({ limit: "500" });
        if (filters?.name?.trim()) params.set("name", filters.name.trim());
        if (filters?.contactNumber?.trim()) params.set("contactNumber", filters.contactNumber.trim());
        if (filters?.vehicleNumber?.trim()) params.set("vehicleNumber", filters.vehicleNumber.trim());
        if (filters?.appointmentDate?.trim()) params.set("appointmentDate", filters.appointmentDate.trim());
        if (filters?.serviceType?.trim()) params.set("serviceType", filters.serviceType.trim());
        if (filters?.whatsappSent) params.set("whatsappSent", filters.whatsappSent);
        if (filters?.customerWhatsappSent) params.set("customerWhatsappSent", filters.customerWhatsappSent);

        const res = await fetch(`/api/service/list?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load service requests");
        setItems(data.items ?? []);
      } catch (e) {
        setItems([]);
        setMessage({
          type: "error",
          text: e instanceof Error ? e.message : "Failed to load service requests",
        });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function handleSearch() {
    fetchItems(getCurrentFilters());
  }

  function handleClearFilters() {
    setNameFilter("");
    setContactFilter("");
    setVehicleFilter("");
    setAppointmentDateFilter("");
    setTypeFilter("");
    setGroupWaFilter("");
    setCustomerWaFilter("");
    fetchItems({
      name: "",
      contactNumber: "",
      vehicleNumber: "",
      appointmentDate: "",
      serviceType: "",
      whatsappSent: "",
      customerWhatsappSent: "",
    });
  }

  async function handleRetry(serviceId: string) {
    setRetryingId(serviceId);
    setMessage(null);
    try {
      const res = await fetch(`/api/service/${serviceId}/retry`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: "error", text: data.error || "Retry failed." });
      } else {
        setMessage({
          type: "success",
          text: "WhatsApp notification sent successfully.",
        });
      }
      await fetchItems(getCurrentFilters());
    } catch {
      setMessage({ type: "error", text: "Retry failed due to a network error." });
    } finally {
      setRetryingId(null);
    }
  }

  async function handleDelete(serviceId: string) {
    if (!window.confirm("Are you sure you want to delete this service booking request?")) {
      return;
    }
    setDeletingId(serviceId);
    setMessage(null);
    try {
      const res = await fetch(`/api/service/${serviceId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error || "Failed to delete service request.",
        });
      } else {
        setMessage({
          type: "success",
          text: "Service request deleted successfully.",
        });
        setItems((prev) => prev.filter((item) => item.id !== serviceId));
      }
    } catch {
      setMessage({
        type: "error",
        text: "Network error while deleting service request.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b-2 border-black bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-black">Service Bookings</h1>
            <p className="text-sm text-black/70">
              View registered service requests and track WhatsApp delivery status.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchItems(getCurrentFilters())}
            disabled={loading}
            className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white disabled:opacity-70"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* Filters */}
          <section className="rounded-2xl border-2 border-black bg-white p-5 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder="Search by customer name"
                className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
              />
              <input
                value={contactFilter}
                onChange={(e) => setContactFilter(e.target.value)}
                placeholder="Contact number"
                className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
              />
              <input
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                placeholder="Vehicle number"
                className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
              />
              <input
                value={appointmentDateFilter}
                onChange={(e) => setAppointmentDateFilter(e.target.value)}
                placeholder="Appointment date"
                className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
              />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-lg border-2 border-black bg-white px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
              >
                <option value="">All Service Types</option>
                <option value="Periodic Service">Periodic Service</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Warranty Claim">Warranty Claim</option>
                <option value="Body Work / Accident Repair">Body Work / Accident Repair</option>
              </select>
              <select
                value={groupWaFilter}
                onChange={(e) => setGroupWaFilter(e.target.value as "" | "true" | "false")}
                className="rounded-lg border-2 border-black bg-white px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
              >
                <option value="">All group WA</option>
                <option value="true">Sent</option>
                <option value="false">Pending</option>
              </select>
              <select
                value={customerWaFilter}
                onChange={(e) => setCustomerWaFilter(e.target.value as "" | "true" | "false")}
                className="rounded-lg border-2 border-black bg-white px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
              >
                <option value="">All customer WA</option>
                <option value="true">Sent</option>
                <option value="false">Not sent</option>
              </select>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSearch}
                className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300"
              >
                Search
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
              >
                Clear filters
              </button>
              <a
                href={`/api/service/list?${(() => {
                  const params = buildFilterParams();
                  params.set("format", "xlsx");
                  params.set("limit", "1000");
                  return params.toString();
                })()}`}
                className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
              >
                Download Excel
              </a>
            </div>
          </section>

          {/* Table */}
          <section className="rounded-xl border-2 border-black bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-black">
                All service booking requests
              </h2>
              <span className="text-sm text-black/60">
                {loading ? "Loading…" : `${items.length} request(s)`}
              </span>
            </div>

            {loading ? (
              <p className="mt-4 text-sm text-black/60">Loading service requests…</p>
            ) : items.length === 0 ? (
              <p className="mt-4 text-sm text-black/60">No service bookings found.</p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border-2 border-black">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-black text-white">
                    <tr>
                      <th className="px-3 py-2">When</th>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2">Vehicle</th>
                      <th className="px-3 py-2">Appointment Date</th>
                      <th className="px-3 py-2">Odometer</th>
                      <th className="px-3 py-2">Service Types</th>
                      <th className="px-3 py-2">Group WA</th>
                      <th className="px-3 py-2">Customer WA</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black bg-white">
                    {items.map((item) => (
                      <tr key={item.id} className="align-top">
                        {/* When */}
                        <td className="px-3 py-2 text-black/70">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )
                            : "-"}
                        </td>

                        {/* Customer */}
                        <td className="px-3 py-2 text-black">
                          <div className="font-medium">
                            {item.name || "Unnamed"}
                          </div>
                          <div className="font-mono text-[11px] text-black/60">
                            {item.contactNumber || "-"}
                          </div>
                          {item.remarks && (
                            <div className="mt-0.5 max-w-[180px] truncate text-[11px] text-black/50" title={item.remarks}>
                              Remarks: {item.remarks}
                            </div>
                          )}
                        </td>

                        {/* Vehicle */}
                        <td className="px-3 py-2 text-black font-semibold">
                          {item.vehicleNumber || "-"}
                        </td>

                        {/* Appointment Date */}
                        <td className="px-3 py-2 text-black font-semibold">
                          {item.appointmentDate || "-"}
                        </td>

                        {/* Odometer */}
                        <td className="px-3 py-2 text-black">
                          {item.odometer != null ? `${item.odometer.toLocaleString()} KMs` : "-"}
                        </td>

                        {/* Types */}
                        <td className="px-3 py-2 text-black font-medium">
                          {item.types && item.types.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {item.types.map(t => (
                                <span key={t} className="inline-block bg-yellow-100 border border-black/10 rounded px-1.5 py-0.5 text-[10px]">
                                  {t}
                                </span>
                              ))}
                            </div>
                          ) : "-"}
                        </td>

                        {/* Group WA */}
                        <td className="px-3 py-2">
                          {item.whatsappSent ? (
                            <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-medium text-yellow-800">
                              Sent
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full border border-black px-2 py-0.5 text-[11px] font-medium text-black">
                              Pending
                            </span>
                          )}
                          {item.whatsappError && (
                            <div className="mt-0.5 max-w-[120px] text-[10px] text-black/60 break-all">
                              {item.whatsappError}
                            </div>
                          )}
                        </td>

                        {/* Customer WA */}
                        <td className="px-3 py-2">
                          {item.customerWhatsappSent ? (
                            <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800">
                              DM Sent
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full border border-black px-2 py-0.5 text-[11px] font-medium text-black">
                              Not sent
                            </span>
                          )}
                          {item.customerWhatsappError && (
                            <div className="mt-0.5 max-w-[120px] text-[10px] text-black/60 break-all">
                              {item.customerWhatsappError}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1.5">
                            {/* In admin portal we don't have searchParams object directly but we can construct the link using its fields */}
                            <a
                              href={`/service/${item.id}?token=${(item as any).trackingCode || ""}`}
                              target="_blank"
                              className="inline-flex justify-center rounded-lg border-2 border-black bg-white px-2.5 py-1 text-[11px] font-medium text-black hover:bg-black hover:text-white"
                            >
                              View Link
                            </a>
                            {!item.whatsappSent && (
                              <button
                                type="button"
                                onClick={() => handleRetry(item.id)}
                                disabled={retryingId === item.id}
                                className="rounded-md bg-yellow-400 px-2.5 py-1 text-[11px] font-medium text-black hover:bg-yellow-300 disabled:opacity-60"
                              >
                                {retryingId === item.id ? "Retrying…" : "Retry WA"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                              className="inline-flex justify-center rounded-lg border-2 border-red-600 bg-white px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-60 cursor-pointer"
                            >
                              {deletingId === item.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {message && (
            <p
              className={`rounded-lg border-2 border-black p-3 text-sm ${
                message.type === "success" ? "bg-yellow-100 text-black" : "bg-black text-white"
              }`}
            >
              {message.text}
            </p>
          )}

        </div>
      </div>
    </div>
  );
}
