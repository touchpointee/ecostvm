"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ModelPicker from "@/app/components/ModelPicker";


const VARIANT_OPTIONS = [
  "Ambient (P/D)",
  "Trend (P/D)",
  "Trend+ (P/D/AT)",
  "Titanium (P/D)",
  "Titanium Plus (O/P/D/AT)",
  "Titanium S (P/D)",
  "Signature (P/D)",
  "Thunder (P/D)",
  "Titanium SE (P/D)",
];
const COLOR_OPTIONS = [
  "Diamond White",
  "Absolute Black",
  "Race Red",
  "Canyon Ridge",
  "Moon Dust Silver",
  "Smoke Grey",
  "Lightning Blue",
  "Kinetic Blue",
  "Mars Red",
  "Golden Bronze",
  "Panther Black",
  "Chill Metallic",
  "Sea Grey",
  "Orange",
  "Others",
];
const BLOOD_GROUP_OPTIONS = ["A+", "A-", "O+", "O-", "AB+", "AB-", "B+", "B-"];
const PAGE_SIZE = 50;

type Member = {
  id: string;
  name: string;
  membershipNumber: string;
  contactNumber: string;
  model: string;
  purchaseMonth: string;
  manufacturingYear: string;
  variant: string;
  vehicleColor: string;
  vehicleNumber: string;
  place: string;
  address: string;
  occupation: string;
  mailId: string;
  bloodGroup: string;
  dateOfBirth: string;
  emergencyContact: string;
  suggestions: string;
  source: string;
  updatedAt: string | null;
};

type UploadResult = {
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
};

type UploadLog = {
  id: string;
  fileName: string;
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  uploadedAt: string;
};

type FormState = Omit<Member, "id" | "source" | "updatedAt">;

const emptyForm: FormState = {
  name: "",
  membershipNumber: "",
  contactNumber: "",
  model: "",
  purchaseMonth: "",
  manufacturingYear: "",
  variant: "",
  vehicleColor: "",
  vehicleNumber: "",
  place: "",
  address: "",
  occupation: "",
  mailId: "",
  bloodGroup: "",
  dateOfBirth: "",
  emergencyContact: "",
  suggestions: "",
};

function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-black/60">
        Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total} members
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="rounded-lg border-2 border-black bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-black hover:text-white disabled:opacity-40"
        >
          ← Prev
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-black/40">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`rounded-lg border-2 border-black px-3 py-1.5 text-xs font-semibold ${
                p === page ? "bg-yellow-400 text-black" : "bg-white text-black hover:bg-black hover:text-white"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="rounded-lg border-2 border-black bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-black hover:text-white disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default function LoginsPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearPhrase, setClearPhrase] = useState("");
  const [clearing, setClearing] = useState(false);
  const [uploadLogs, setUploadLogs] = useState<UploadLog[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchMembers = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/logins?page=${p}&limit=${PAGE_SIZE}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load members");
      setMembers(data.items ?? []);
      setTotal(data.total ?? 0);
      setPage(p);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to load members" });
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers(1);
  }, [fetchMembers]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const fetchNextMembership = useCallback(async () => {
    setLoadingMembership(true);
    try {
      const res = await fetch("/api/next-membership");
      const data = await res.json();
      if (data.next) updateField("membershipNumber", String(data.next));
    } catch {
      // ignore
    } finally {
      setLoadingMembership(false);
    }
  }, []);

  const fetchUploadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/logins/upload/logs");
      const data = await res.json();
      if (res.ok) setUploadLogs(data.logs ?? []);
    } catch {
      // ignore
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  const checkMembershipNumber = async (num: string) => {
    if (!num || num.trim() === "") return;
    try {
      const res = await fetch(`/api/logins?check=membership&membershipNumber=${encodeURIComponent(num)}`);
      const data = await res.json();
      if (data.exists) {
        setMessage({ type: "error", text: `Membership number ${num} is already taken. Suggesting ${data.next}.` });
        updateField("membershipNumber", data.next);
      }
    } catch (e) {
      console.error("Failed to check membership number", e);
    }
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[a-zA-Z ]+$/.test(form.name)) {
      setMessage({ type: "error", text: "Name should only contain letters and spaces." });
      return;
    }
    if (!/^\d{10}$/.test(form.contactNumber)) {
      setMessage({ type: "error", text: "Contact number must be exactly 10 digits." });
      return;
    }
    if (!/^([A-Za-z]{2}[ -]?[0-9]{1,2}[ -]?[A-Za-z]{0,2}[ -]?[0-9]{4}|[0-9]{2}[ -]?[Bb][Hh][ -]?[0-9]{4}[ -]?[A-Za-z]{1,2})$/.test(form.vehicleNumber)) {
      setMessage({ type: "error", text: "Invalid vehicle number format (e.g., KL01AB1234 or 21BH1234AA)." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/logins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, mode: "add" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to save member" });
        return;
      }
      setMessage({ type: "success", text: "Member saved successfully." });
      setForm(emptyForm);
      setAddMemberOpen(false);
      fetchNextMembership();
      await fetchMembers(1);
    } catch {
      setMessage({ type: "error", text: "Something went wrong while saving." });
    } finally {
      setSaving(false);
    }
  }

  async function handleMigrateMembership() {
    if (!confirm("This will strip decimals from ALL membership numbers (e.g. 1.0 → 1). Continue?")) return;
    setMigrating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/migrate-membership", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setMessage({ type: "error", text: data.error || "Migration failed." }); return; }
      setMessage({ type: "success", text: data.message });
      await fetchMembers(1);
    } catch {
      setMessage({ type: "error", text: "Migration failed." });
    } finally {
      setMigrating(false);
    }
  }

  async function handleClearAll() {
    setClearing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/clear-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE ALL MEMBERS" }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage({ type: "error", text: data.error || "Failed to clear." }); return; }
      setMessage({ type: "success", text: data.message });
      setClearOpen(false);
      setClearPhrase("");
      await fetchMembers(1);
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setClearing(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) {
      setMessage({ type: "error", text: "Choose an Excel file first." });
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      const res = await fetch("/api/logins/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Upload failed" });
        return;
      }
      setUploadResult({
        totalRows: data.totalRows,
        inserted: data.inserted,
        updated: data.updated,
        skipped: data.skipped,
        errors: data.errors || [],
      });
      setMessage({ type: "success", text: "Upload finished. Check the summary below." });
      setUploadFile(null);
      if (logsOpen) fetchUploadLogs();
      await fetchMembers(1);
    } catch {
      setMessage({ type: "error", text: "Something went wrong while uploading." });
    } finally {
      setUploading(false);
    }
  }

  const inputCls = "mt-1 block w-full rounded-lg border-2 border-black px-3 py-2 text-black focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500";
  const selectCls = `${inputCls} bg-white`;
  const labelCls = "block text-sm font-medium text-black";

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b-2 border-black bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-black">Members</h1>
            <p className="text-sm text-black/70">Add single member records or upload an Excel file.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/logins/search"
              className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
            >
              Search
            </Link>
            <button
              type="button"
              onClick={() => { setAddMemberOpen(true); fetchNextMembership(); }}
              className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300"
            >
              + Add member
            </button>
            <a
              href="/api/logins?format=xlsx"
              className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300"
            >
              Download Excel
            </a>
            <button
              type="button"
              onClick={handleMigrateMembership}
              disabled={migrating}
              title="Strip decimals from all membership numbers (e.g. 1.0 → 1)"
              className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-black hover:text-white disabled:opacity-60"
            >
              {migrating ? "Fixing…" : "Fix Membership No."}
            </button>
            <button
              type="button"
              onClick={() => { setClearOpen(true); setClearPhrase(""); }}
              className="rounded-lg border-2 border-red-600 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-600 hover:text-white"
            >
              🗑 Clear All
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-full space-y-8">

          {/* Upload + summary */}
          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-2xl border-2 border-black bg-white p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-black">Upload Excel</h2>
              <p className="mt-1 text-sm text-black/80">
                Columns: Name, Membership no, Contact no, Model, Purchase Month, Manufacturing Year, Variant, Color of the vehicle, Vehicle no, Place, Address, Occupation, Mail ID, Blood Group, Date of birth, Emergency Contact, Suggestions.
              </p>
              <form onSubmit={handleUpload} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="memberFile" className="block text-sm font-medium text-black">Excel file (.xlsx)</label>
                  <input
                    id="memberFile"
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                    className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-sm text-black file:mr-4 file:rounded-md file:border-0 file:bg-yellow-400 file:px-3 file:py-2 file:font-semibold file:text-black"
                  />
                </div>
                <button type="submit" disabled={uploading} className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-70">
                  {uploading ? "Uploading..." : "Upload data"}
                </button>
              </form>
              <div className="mt-6 rounded-xl border-2 border-black bg-yellow-50 p-4 text-sm text-black/90">
                <p className="font-semibold text-black">How it works</p>
                <p className="mt-1">Existing contact numbers are updated. New ones are inserted and can log in immediately.</p>
              </div>
            </section>

            {uploadResult && (
              <section className="rounded-2xl border-2 border-black bg-white p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-black">Upload Summary</h2>
                  <button onClick={() => setUploadResult(null)} className="text-xs font-medium text-black/50 hover:text-black">Clear</button>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-4">
                  <div className="rounded-xl border-2 border-black bg-green-50 p-3 text-center">
                    <div className="text-xl font-bold text-black">{uploadResult.inserted}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-black/60">Inserted</div>
                  </div>
                  <div className="rounded-xl border-2 border-black bg-blue-50 p-3 text-center">
                    <div className="text-xl font-bold text-black">{uploadResult.updated}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-black/60">Updated</div>
                  </div>
                  <div className="rounded-xl border-2 border-black bg-red-50 p-3 text-center">
                    <div className="text-xl font-bold text-black">{uploadResult.skipped}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-black/60">Skipped</div>
                  </div>
                </div>
                {uploadResult.errors.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-bold text-black">Error Log</h3>
                    <div className="mt-2 max-h-[200px] overflow-y-auto rounded-xl border-2 border-black bg-black p-3 font-mono text-xs">
                      {uploadResult.errors.map((err, i) => (
                        <div key={i} className="mb-1.5 flex gap-2 last:mb-0">
                          <span className="shrink-0 text-red-400">✖</span>
                          <span className="text-white/90">{err}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Upload History */}
          <section className="rounded-2xl border-2 border-black bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-black">Upload History</h2>
                <p className="text-sm text-black/60">Past Excel uploads and their results.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !logsOpen;
                  setLogsOpen(next);
                  if (next && uploadLogs.length === 0) fetchUploadLogs();
                }}
                className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-black hover:text-white"
              >
                {logsOpen ? "Hide logs ▲" : "View logs ▼"}
              </button>
            </div>

            {logsOpen && (
              <div className="mt-5">
                {loadingLogs ? (
                  <p className="text-sm text-black/60">Loading...</p>
                ) : uploadLogs.length === 0 ? (
                  <p className="text-sm text-black/60">No upload history yet.</p>
                ) : (
                  <div className="space-y-3">
                    {uploadLogs.map((log) => (
                      <div key={log.id} className="rounded-xl border-2 border-black bg-white overflow-hidden">
                        <button
                          type="button"
                          className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-yellow-50"
                          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-lg">📄</span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-black">{log.fileName}</p>
                              <p className="text-xs text-black/50">
                                {new Date(log.uploadedAt).toLocaleString("en-IN", {
                                  day: "2-digit", month: "short", year: "numeric",
                                  hour: "2-digit", minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-green-100 px-2.5 py-1 text-green-700">+{log.inserted}</span>
                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-700">↻{log.updated}</span>
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700">✖{log.skipped}</span>
                            <span className="ml-2 text-black/40">{expandedLog === log.id ? "▲" : "▼"}</span>
                          </div>
                        </button>

                        {expandedLog === log.id && (
                          <div className="border-t-2 border-black px-4 py-4">
                            <div className="mb-4 grid grid-cols-4 gap-3 text-center text-xs">
                              <div className="rounded-lg bg-black/5 p-2">
                                <div className="text-lg font-bold text-black">{log.totalRows}</div>
                                <div className="font-semibold uppercase tracking-wide text-black/50">Total</div>
                              </div>
                              <div className="rounded-lg bg-green-50 p-2">
                                <div className="text-lg font-bold text-green-700">{log.inserted}</div>
                                <div className="font-semibold uppercase tracking-wide text-green-600">Inserted</div>
                              </div>
                              <div className="rounded-lg bg-blue-50 p-2">
                                <div className="text-lg font-bold text-blue-700">{log.updated}</div>
                                <div className="font-semibold uppercase tracking-wide text-blue-600">Updated</div>
                              </div>
                              <div className="rounded-lg bg-red-50 p-2">
                                <div className="text-lg font-bold text-red-700">{log.skipped}</div>
                                <div className="font-semibold uppercase tracking-wide text-red-600">Skipped</div>
                              </div>
                            </div>
                            {log.errors.length > 0 ? (
                              <div>
                                <p className="mb-2 text-xs font-bold text-black">Error Log ({log.errors.length})</p>
                                <div className="max-h-[200px] overflow-y-auto rounded-xl border-2 border-black bg-black p-3 font-mono text-xs">
                                  {log.errors.map((err, i) => (
                                    <div key={i} className="mb-1.5 flex gap-2 last:mb-0">
                                      <span className="shrink-0 text-red-400">✖</span>
                                      <span className="text-white/90">{err}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-black/50">No errors in this upload.</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={fetchUploadLogs}
                      className="mt-2 rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
                    >
                      Refresh logs
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Members table */}
          <section className="rounded-xl border-2 border-black bg-white p-6 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-black">
                  Stored members
                  {total > 0 && <span className="ml-2 text-sm font-normal text-black/60">({total} total)</span>}
                </h2>
                <p className="mt-0.5 text-sm text-black/70">All {PAGE_SIZE} records per page, sorted by membership number.</p>
              </div>
              <button onClick={() => fetchMembers(page)} className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white">
                Refresh
              </button>
            </div>

            {loading ? (
              <p className="mt-4 text-sm text-black/70">Loading...</p>
            ) : members.length === 0 ? (
              <p className="mt-4 text-sm text-black/70">No members found yet.</p>
            ) : (
              <>
                <div className="mt-4 overflow-x-auto rounded-lg border-2 border-black">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-black text-white">
                      <tr>
                        <th className="whitespace-nowrap px-3 py-2">Name</th>
                        <th className="whitespace-nowrap px-3 py-2">Membership No</th>
                        <th className="whitespace-nowrap px-3 py-2">Contact No</th>
                        <th className="whitespace-nowrap px-3 py-2">Model</th>
                        <th className="whitespace-nowrap px-3 py-2">Purchase Month</th>
                        <th className="whitespace-nowrap px-3 py-2">Mfg Year</th>
                        <th className="whitespace-nowrap px-3 py-2">Variant</th>
                        <th className="whitespace-nowrap px-3 py-2">Color</th>
                        <th className="whitespace-nowrap px-3 py-2">Vehicle No</th>
                        <th className="whitespace-nowrap px-3 py-2">Place</th>
                        <th className="whitespace-nowrap px-3 py-2">Address</th>
                        <th className="whitespace-nowrap px-3 py-2">Occupation</th>
                        <th className="whitespace-nowrap px-3 py-2">Mail ID</th>
                        <th className="whitespace-nowrap px-3 py-2">Blood Group</th>
                        <th className="whitespace-nowrap px-3 py-2">Date of Birth</th>
                        <th className="whitespace-nowrap px-3 py-2">Emergency Contact</th>
                        <th className="whitespace-nowrap px-3 py-2">Suggestions</th>
                        <th className="whitespace-nowrap px-3 py-2">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/10 bg-white">
                      {members.map((m) => (
                        <tr
                          key={m.id}
                          onClick={() => router.push(`/admin/logins/${m.id}`)}
                          className="cursor-pointer hover:bg-yellow-50 active:bg-yellow-100"
                          title="Click to view details"
                        >
                          <td className="whitespace-nowrap px-3 py-2 font-medium text-black">{m.name || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-black">{m.membershipNumber || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 font-mono text-black">{m.contactNumber || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-black">{m.model || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-black">{m.purchaseMonth || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-black">{m.manufacturingYear || "—"}</td>
                          <td className="max-w-[160px] truncate px-3 py-2 text-black" title={m.variant}>{m.variant || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-black">{m.vehicleColor || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 font-mono text-black">{m.vehicleNumber || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-black">{m.place || "—"}</td>
                          <td className="max-w-[160px] truncate px-3 py-2 text-black" title={m.address}>{m.address || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-black">{m.occupation || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-black">{m.mailId || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-black">{m.bloodGroup || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-black">{m.dateOfBirth || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 font-mono text-black">{m.emergencyContact || "—"}</td>
                          <td className="max-w-[180px] truncate px-3 py-2 text-black/70" title={m.suggestions}>{m.suggestions || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-black/60">{m.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={(p) => fetchMembers(p)} />
              </>
            )}
          </section>

          {message && (
            <p className={`rounded-lg border-2 border-black p-3 text-sm ${message.type === "success" ? "bg-yellow-100 text-black" : "bg-black text-white"}`}>
              {message.text}
            </p>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {addMemberOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setAddMemberOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-member-title"
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border-2 border-black bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-black bg-yellow-100 px-4 py-4 sm:px-6">
              <div>
                <h2 id="add-member-title" className="text-lg font-semibold text-black">Add member</h2>
                <p className="text-sm text-black/70">Contact number is used for login access.</p>
              </div>
              <button type="button" onClick={() => setAddMemberOpen(false)} className="rounded-lg p-2 text-black hover:bg-black hover:text-white" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 sm:p-6">
              {message && (
                <div className={`mb-4 rounded-lg border-2 border-black p-3 text-sm ${message.type === "success" ? "bg-yellow-100 text-black" : "bg-black text-white"}`}>
                  {message.text}
                </div>
              )}
              <form onSubmit={handleSave} className="space-y-6">
                {/* Personal */}
                <div>
                  <p className="mb-3 border-b-2 border-black pb-1 text-xs font-bold uppercase tracking-widest text-black">Personal</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="name" className={labelCls}>Name *</label>
                      <input id="name" value={form.name} onChange={(e) => updateField("name", e.target.value.replace(/[^a-zA-Z ]/g, ""))} required className={inputCls} />
                    </div>
                    <div>
                      <label htmlFor="membershipNumber" className={labelCls}>Membership No</label>
                      <div className="relative mt-1">
                        <input
                          id="membershipNumber"
                          value={loadingMembership ? "" : form.membershipNumber}
                          readOnly
                          placeholder={loadingMembership ? "Loading…" : ""}
                          className="block w-full rounded-lg border-2 border-black bg-gray-50 px-3 py-2 pr-9 text-black cursor-not-allowed opacity-80 focus:outline-none"
                        />
                        <span className="absolute inset-y-0 right-2 flex items-center text-black/40">
                          {loadingMembership ? (
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="contactNumber" className={labelCls}>Contact No *</label>
                      <input id="contactNumber" type="tel" inputMode="numeric" maxLength={10} value={form.contactNumber} onChange={(e) => updateField("contactNumber", e.target.value.replace(/\D/g, ""))} required className={inputCls} />
                    </div>
                    <div>
                      <label htmlFor="dateOfBirth" className={labelCls}>Date of Birth *</label>
                      <input id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={(e) => updateField("dateOfBirth", e.target.value)} required className={inputCls} />
                    </div>
                    <div>
                      <label htmlFor="bloodGroup" className={labelCls}>Blood Group</label>
                      <select id="bloodGroup" value={form.bloodGroup} onChange={(e) => updateField("bloodGroup", e.target.value)} className={selectCls}>
                        <option value="">Select</option>
                        {BLOOD_GROUP_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="emergencyContact" className={labelCls}>Emergency Contact</label>
                      <input id="emergencyContact" type="tel" inputMode="numeric" maxLength={10} value={form.emergencyContact} onChange={(e) => updateField("emergencyContact", e.target.value.replace(/\D/g, ""))} className={inputCls} />
                    </div>
                    <div>
                      <label htmlFor="occupation" className={labelCls}>Occupation</label>
                      <input id="occupation" value={form.occupation} onChange={(e) => updateField("occupation", e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label htmlFor="mailId" className={labelCls}>Mail ID</label>
                      <input id="mailId" type="email" value={form.mailId} onChange={(e) => updateField("mailId", e.target.value)} className={inputCls} />
                    </div>
                  </div>
                </div>
                {/* Location */}
                <div>
                  <p className="mb-3 border-b-2 border-black pb-1 text-xs font-bold uppercase tracking-widest text-black">Location</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="place" className={labelCls}>Place *</label>
                      <input id="place" value={form.place} onChange={(e) => updateField("place", e.target.value)} required className={inputCls} />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="address" className={labelCls}>Address *</label>
                      <textarea id="address" rows={2} value={form.address} onChange={(e) => updateField("address", e.target.value)} required className={inputCls} />
                    </div>
                  </div>
                </div>
                {/* Vehicle */}
                <div>
                  <p className="mb-3 border-b-2 border-black pb-1 text-xs font-bold uppercase tracking-widest text-black">Vehicle</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className={labelCls}>Model</label>
                      <div className="mt-2">
                        <ModelPicker value={form.model} onChange={(v) => updateField("model", v)} />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="purchaseMonth" className={labelCls}>Purchase Month</label>
                      <input id="purchaseMonth" value={form.purchaseMonth} onChange={(e) => updateField("purchaseMonth", e.target.value)} placeholder="e.g. March 2022" className={inputCls} />
                    </div>
                    <div>
                      <label htmlFor="manufacturingYear" className={labelCls}>Manufacturing Year</label>
                      <input id="manufacturingYear" value={form.manufacturingYear} onChange={(e) => updateField("manufacturingYear", e.target.value)} placeholder="e.g. 2022" className={inputCls} />
                    </div>
                    <div>
                      <label htmlFor="variant" className={labelCls}>Variant</label>
                      <select id="variant" value={form.variant} onChange={(e) => updateField("variant", e.target.value)} className={selectCls}>
                        <option value="">Select</option>
                        {VARIANT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="vehicleColor" className={labelCls}>Color of the Vehicle</label>
                      <select id="vehicleColor" value={form.vehicleColor} onChange={(e) => updateField("vehicleColor", e.target.value)} className={selectCls}>
                        <option value="">Select</option>
                        {COLOR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="vehicleNumber" className={labelCls}>Vehicle No *</label>
                      <input id="vehicleNumber" value={form.vehicleNumber} onChange={(e) => updateField("vehicleNumber", e.target.value.toUpperCase())} required className={`${inputCls} uppercase`} />
                    </div>
                  </div>
                </div>
                {/* Suggestions */}
                <div>
                  <p className="mb-3 border-b-2 border-black pb-1 text-xs font-bold uppercase tracking-widest text-black">Suggestions</p>
                  <textarea id="suggestions" rows={3} value={form.suggestions} onChange={(e) => updateField("suggestions", e.target.value)} className={inputCls} />
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button type="submit" disabled={saving} className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-70">
                    {saving ? "Saving..." : "Save member"}
                  </button>
                  <button type="button" onClick={() => setForm(emptyForm)} className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white">
                    Clear form
                  </button>
                  <button type="button" onClick={() => setAddMemberOpen(false)} className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Clear All Confirmation Modal ── */}
      {clearOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => { if (!clearing) { setClearOpen(false); setClearPhrase(""); } }}
        >
          <div
            className="w-full max-w-md rounded-2xl border-2 border-red-600 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h2 className="text-base font-bold text-black">Delete ALL members?</h2>
                <p className="text-sm text-black/60">This cannot be undone.</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Every member record will be permanently deleted from the database. Members will no longer be able to log in.
            </div>

            <div className="mt-5">
              <label className="block text-sm font-semibold text-black">
                Type <span className="font-mono text-red-600">DELETE ALL MEMBERS</span> to confirm
              </label>
              <input
                type="text"
                value={clearPhrase}
                onChange={(e) => setClearPhrase(e.target.value)}
                placeholder="DELETE ALL MEMBERS"
                className="mt-2 block w-full rounded-lg border-2 border-black px-3 py-2 font-mono text-sm text-black focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-400"
                autoComplete="off"
              />
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleClearAll}
                disabled={clearing || clearPhrase !== "DELETE ALL MEMBERS"}
                className="flex-1 rounded-lg border-2 border-red-600 bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {clearing ? "Deleting…" : "Yes, delete everything"}
              </button>
              <button
                type="button"
                onClick={() => { setClearOpen(false); setClearPhrase(""); }}
                disabled={clearing}
                className="flex-1 rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-black hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
