"use client";

import { useCallback, useEffect, useState } from "react";

type Member = {
  id: string;
  name: string;
  membershipNumber: string;
  contactNumber: string;
  vehicleColor: string;
  vehicleNumber: string;
  place: string;
  address: string;
  bloodGroup: string;
  dateOfBirth: string;
  updatedAt: string | null;
};

type Filters = {
  q: string;
  name: string;
  membershipNumber: string;
  contactNumber: string;
  vehicleNumber: string;
  vehicleColor: string;
  place: string;
  address: string;
  bloodGroup: string;
  dateOfBirth: string;
};

const emptyFilters: Filters = {
  q: "",
  name: "",
  membershipNumber: "",
  contactNumber: "",
  vehicleNumber: "",
  vehicleColor: "",
  place: "",
  address: "",
  bloodGroup: "",
  dateOfBirth: "",
};

export default function MemberSearchPage() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [results, setResults] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const runSearch = useCallback(async (nextFilters: Filters) => {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value.trim()) params.set(key, value.trim());
      });
      const res = await fetch(`/api/logins?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to search members");
      setResults(data.items ?? []);
      if ((data.items ?? []).length === 0) {
        setMessage("No members matched these filters.");
      }
    } catch (e) {
      setResults([]);
      setMessage(e instanceof Error ? e.message : "Failed to search members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runSearch(emptyFilters);
  }, [runSearch]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    const next = { ...filters, [key]: value };
    setFilters(next);
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b-2 border-black bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-black">Member Search</h1>
        <p className="text-sm text-black/70">Search members with all available filters.</p>
      </header>
      <div className="p-6">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="rounded-2xl border-2 border-black bg-white p-6 shadow-lg">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <input value={filters.q} onChange={(e) => updateFilter("q", e.target.value)} placeholder="General search" className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
              <input value={filters.name} onChange={(e) => updateFilter("name", e.target.value)} placeholder="Name" className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
              <input value={filters.membershipNumber} onChange={(e) => updateFilter("membershipNumber", e.target.value)} placeholder="Membership no" className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
              <input value={filters.contactNumber} onChange={(e) => updateFilter("contactNumber", e.target.value)} placeholder="Contact no" className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
              <input value={filters.vehicleNumber} onChange={(e) => updateFilter("vehicleNumber", e.target.value)} placeholder="Vehicle no" className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
              <input value={filters.vehicleColor} onChange={(e) => updateFilter("vehicleColor", e.target.value)} placeholder="Vehicle color" className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
              <input value={filters.place} onChange={(e) => updateFilter("place", e.target.value)} placeholder="Place" className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
              <input value={filters.address} onChange={(e) => updateFilter("address", e.target.value)} placeholder="Address" className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
              <input value={filters.bloodGroup} onChange={(e) => updateFilter("bloodGroup", e.target.value)} placeholder="Blood group" className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
              <input value={filters.dateOfBirth} onChange={(e) => updateFilter("dateOfBirth", e.target.value)} placeholder="Date of birth" className="rounded-lg border-2 border-black px-3 py-2 text-sm text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500" />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={() => runSearch(filters)} className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300">
                Search
              </button>
              <button
                onClick={() => {
                  setFilters(emptyFilters);
                  runSearch(emptyFilters);
                }}
                className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
              >
                Clear filters
              </button>
            </div>
          </section>

          <section className="rounded-xl border-2 border-black bg-white p-6 shadow-md">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black">Results</h2>
              <span className="text-sm text-black/70">{loading ? "Loading..." : `${results.length} record(s)`}</span>
            </div>
            <div className="mt-4 overflow-x-auto rounded-lg border-2 border-black">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-black text-white">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Membership</th>
                    <th className="px-3 py-2">Contact</th>
                    <th className="px-3 py-2">Color</th>
                    <th className="px-3 py-2">Vehicle</th>
                    <th className="px-3 py-2">Place</th>
                    <th className="px-3 py-2">Address</th>
                    <th className="px-3 py-2">Blood</th>
                    <th className="px-3 py-2">DOB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black bg-white">
                  {results.map((member) => (
                    <tr key={member.id}>
                      <td className="px-3 py-2 text-black">{member.name || "-"}</td>
                      <td className="px-3 py-2 text-black">{member.membershipNumber || "-"}</td>
                      <td className="px-3 py-2 font-mono text-black">{member.contactNumber || "-"}</td>
                      <td className="px-3 py-2 text-black">{member.vehicleColor || "-"}</td>
                      <td className="px-3 py-2 text-black">{member.vehicleNumber || "-"}</td>
                      <td className="px-3 py-2 text-black">{member.place || "-"}</td>
                      <td className="px-3 py-2 text-black">{member.address || "-"}</td>
                      <td className="px-3 py-2 text-black">{member.bloodGroup || "-"}</td>
                      <td className="px-3 py-2 text-black">{member.dateOfBirth || "-"}</td>
                    </tr>
                  ))}
                  {!loading && results.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-3 py-6 text-center text-sm text-black/70">
                        {message ?? "No records found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
