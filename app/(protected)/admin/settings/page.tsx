"use client";

import { useEffect, useState } from "react";

type Message = { type: "success" | "error"; text: string };

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border-2 border-black bg-white p-6 shadow-md">
      <div className="mb-5 border-b-2 border-black pb-4">
        <h2 className="text-base font-bold text-black">{title}</h2>
        <p className="mt-1 text-sm text-black/60">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Alert({ msg, onClose }: { msg: Message; onClose: () => void }) {
  return (
    <div className={`flex items-start justify-between gap-3 rounded-lg border-2 border-black p-3 text-sm ${
      msg.type === "success" ? "bg-yellow-100 text-black" : "bg-black text-white"
    }`}>
      <span>{msg.text}</span>
      <button type="button" onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}

const inputCls = "mt-1 block w-full rounded-lg border-2 border-black px-3 py-2.5 text-black bg-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500 focus:outline-none";
const labelCls = "block text-sm font-medium text-black";

const PLACEHOLDERS = [
  { tag: "{name}", desc: "Member's full name" },
  { tag: "{membershipNumber}", desc: "Membership number" },
  { tag: "{contactNumber}", desc: "Phone number" },
  { tag: "{model}", desc: "Car model" },
  { tag: "{vehicleNumber}", desc: "Vehicle registration number" },
  { tag: "{place}", desc: "Member's place/city" },
  { tag: "{variant}", desc: "Car variant" },
  { tag: "{vehicleColor}", desc: "Car color" },
  { tag: "{purchaseMonth}", desc: "Month of purchase" },
  { tag: "{manufacturingYear}", desc: "Manufacturing year" },
  { tag: "{bloodGroup}", desc: "Blood group" },
  { tag: "{mailId}", desc: "Email address" },
  { tag: "{occupation}", desc: "Occupation" },
];

export default function SettingsPage() {
  const [currentUsername, setCurrentUsername] = useState("");
  const [loadingUsername, setLoadingUsername] = useState(true);

  // Change username form
  const [newUsername, setNewUsername] = useState("");
  const [usernamePassword, setUsernamePassword] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<Message | null>(null);

  // Change password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<Message | null>(null);

  // Welcome message template
  const [welcomeTemplate, setWelcomeTemplate] = useState("");
  const [savingWelcome, setSavingWelcome] = useState(false);
  const [welcomeMsg, setWelcomeMsg] = useState<Message | null>(null);
  const [welcomePassword, setWelcomePassword] = useState("");
  const [showWelcomePw, setShowWelcomePw] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Show/hide password toggles
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [showUsernamePw, setShowUsernamePw] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setCurrentUsername(d.username ?? "");
        setWelcomeTemplate(d.welcomeTemplate ?? "");
      })
      .catch(() => {})
      .finally(() => setLoadingUsername(false));
  }, []);

  async function handleChangeUsername(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername.trim()) { setUsernameMsg({ type: "error", text: "Enter a new username." }); return; }
    if (newUsername.trim().length < 3) { setUsernameMsg({ type: "error", text: "Username must be at least 3 characters." }); return; }
    if (!usernamePassword) { setUsernameMsg({ type: "error", text: "Enter your current password to confirm." }); return; }

    setSavingUsername(true);
    setUsernameMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_username", newUsername: newUsername.trim(), currentPassword: usernamePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUsernameMsg({ type: "error", text: data.error || "Failed to update username." });
        return;
      }
      setUsernameMsg({ type: "success", text: data.message || "Username updated." });
      setCurrentUsername(newUsername.trim());
      setNewUsername("");
      setUsernamePassword("");
    } catch {
      setUsernameMsg({ type: "error", text: "Something went wrong." });
    } finally {
      setSavingUsername(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) { setPasswordMsg({ type: "error", text: "Enter your current password." }); return; }
    if (!newPassword || newPassword.length < 6) { setPasswordMsg({ type: "error", text: "New password must be at least 6 characters." }); return; }
    if (newPassword !== confirmPassword) { setPasswordMsg({ type: "error", text: "New passwords do not match." }); return; }

    setSavingPassword(true);
    setPasswordMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_password", currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordMsg({ type: "error", text: data.error || "Failed to update password." });
        return;
      }
      setPasswordMsg({ type: "success", text: data.message || "Password updated." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordMsg({ type: "error", text: "Something went wrong." });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSaveWelcome(e: React.FormEvent) {
    e.preventDefault();
    if (!welcomeTemplate.trim()) { setWelcomeMsg({ type: "error", text: "Template cannot be empty." }); return; }
    if (!welcomePassword) { setWelcomeMsg({ type: "error", text: "Enter your current password to confirm." }); return; }

    setSavingWelcome(true);
    setWelcomeMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_welcome_template", template: welcomeTemplate, currentPassword: welcomePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWelcomeMsg({ type: "error", text: data.error || "Failed to save template." });
        return;
      }
      setWelcomeMsg({ type: "success", text: data.message || "Template saved." });
      setWelcomePassword("");
    } catch {
      setWelcomeMsg({ type: "error", text: "Something went wrong." });
    } finally {
      setSavingWelcome(false);
    }
  }

  function insertPlaceholder(tag: string) {
    setWelcomeTemplate((prev) => prev + tag);
  }

  const welcomePreview = welcomeTemplate.replace(/\{(\w+)\}/g, (_, key) => {
    const map: Record<string, string> = {
      name: "Ajmal Khan",
      membershipNumber: "42",
      contactNumber: "9876543210",
      model: "EcoSport",
      vehicleNumber: "KL01AB1234",
      place: "Trivandrum",
      variant: "Titanium",
      vehicleColor: "Race Red",
      purchaseMonth: "March",
      manufacturingYear: "2021",
      bloodGroup: "O+",
      mailId: "ajmal@example.com",
      occupation: "Engineer",
    };
    return map[key] ?? `{${key}}`;
  });

  function PasswordInput({
    id, value, onChange, placeholder, show, onToggle,
  }: {
    id: string; value: string; onChange: (v: string) => void;
    placeholder?: string; show: boolean; onToggle: () => void;
  }) {
    return (
      <div className="relative mt-1">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="block w-full rounded-lg border-2 border-black px-3 py-2.5 pr-11 text-black bg-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-black/50 hover:text-black"
          tabIndex={-1}
        >
          {show ? (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b-2 border-black bg-white px-4 py-4 sm:px-6">
        <h1 className="text-lg font-semibold text-black">Settings</h1>
        <p className="text-sm text-black/60">Manage admin credentials and message templates.</p>
      </header>

      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-xl space-y-6">

          {/* Current credentials info */}
          <div className="rounded-xl border-2 border-black bg-yellow-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-black/50">Current Username</p>
            <p className="mt-1 text-base font-semibold text-black">
              {loadingUsername ? "Loading…" : currentUsername || "—"}
            </p>
          </div>

          {/* Change Username */}
          <Section
            title="Change Username"
            description="Update the admin login username. Your current password is required to confirm."
          >
            {usernameMsg && <div className="mb-4"><Alert msg={usernameMsg} onClose={() => setUsernameMsg(null)} /></div>}
            <form onSubmit={handleChangeUsername} className="space-y-4">
              <div>
                <label htmlFor="newUsername" className={labelCls}>New Username</label>
                <input
                  id="newUsername"
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter new username"
                  autoComplete="off"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="usernamePassword" className={labelCls}>Current Password</label>
                <PasswordInput
                  id="usernamePassword"
                  value={usernamePassword}
                  onChange={setUsernamePassword}
                  placeholder="Enter current password to confirm"
                  show={showUsernamePw}
                  onToggle={() => setShowUsernamePw((v) => !v)}
                />
              </div>
              <button
                type="submit"
                disabled={savingUsername}
                className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-70"
              >
                {savingUsername ? "Saving…" : "Update Username"}
              </button>
            </form>
          </Section>

          {/* Change Password */}
          <Section
            title="Change Password"
            description="Update the admin login password. Minimum 6 characters."
          >
            {passwordMsg && <div className="mb-4"><Alert msg={passwordMsg} onClose={() => setPasswordMsg(null)} /></div>}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className={labelCls}>Current Password</label>
                <PasswordInput
                  id="currentPassword"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  placeholder="Enter current password"
                  show={showCurrentPw}
                  onToggle={() => setShowCurrentPw((v) => !v)}
                />
              </div>
              <div>
                <label htmlFor="newPassword" className={labelCls}>New Password</label>
                <PasswordInput
                  id="newPassword"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="At least 6 characters"
                  show={showNewPw}
                  onToggle={() => setShowNewPw((v) => !v)}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className={labelCls}>Confirm New Password</label>
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Repeat new password"
                  show={showConfirmPw}
                  onToggle={() => setShowConfirmPw((v) => !v)}
                />
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>
                )}
              </div>
              <button
                type="submit"
                disabled={savingPassword}
                className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-70"
              >
                {savingPassword ? "Saving…" : "Update Password"}
              </button>
            </form>
          </Section>

          {/* Welcome Message Template */}
          <Section
            title="WhatsApp Welcome Message"
            description="This message is automatically sent to a member's WhatsApp when their registration is accepted."
          >
            {welcomeMsg && <div className="mb-4"><Alert msg={welcomeMsg} onClose={() => setWelcomeMsg(null)} /></div>}

            {/* Placeholder chips */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-black/50">Available Placeholders</p>
              <div className="flex flex-wrap gap-1.5">
                {PLACEHOLDERS.map((p) => (
                  <button
                    key={p.tag}
                    type="button"
                    title={p.desc}
                    onClick={() => insertPlaceholder(p.tag)}
                    className="rounded-full border border-black/30 bg-yellow-50 px-2.5 py-0.5 font-mono text-xs text-black hover:bg-yellow-200"
                  >
                    {p.tag}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-black/40">Click a placeholder to insert it at the end of the message.</p>
            </div>

            <form onSubmit={handleSaveWelcome} className="space-y-4">
              <div>
                <label htmlFor="welcomeTemplate" className={labelCls}>Message Template</label>
                <textarea
                  id="welcomeTemplate"
                  rows={10}
                  value={welcomeTemplate}
                  onChange={(e) => setWelcomeTemplate(e.target.value)}
                  placeholder="Type your welcome message here..."
                  className="mt-1 block w-full rounded-lg border-2 border-black px-3 py-2.5 font-mono text-sm text-black bg-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500 focus:outline-none resize-y"
                />
              </div>

              {/* Preview toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowPreview((v) => !v)}
                  className="text-xs font-semibold text-black/60 underline underline-offset-2 hover:text-black"
                >
                  {showPreview ? "Hide preview ▲" : "Show preview with sample data ▼"}
                </button>
                {showPreview && (
                  <div className="mt-3 rounded-xl border-2 border-black bg-black/5 p-4">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-black/40">Preview</p>
                    <pre className="whitespace-pre-wrap text-sm text-black leading-relaxed font-sans">{welcomePreview}</pre>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="welcomePassword" className={labelCls}>Current Password (to confirm)</label>
                <PasswordInput
                  id="welcomePassword"
                  value={welcomePassword}
                  onChange={setWelcomePassword}
                  placeholder="Enter current password"
                  show={showWelcomePw}
                  onToggle={() => setShowWelcomePw((v) => !v)}
                />
              </div>
              <button
                type="submit"
                disabled={savingWelcome}
                className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-70"
              >
                {savingWelcome ? "Saving…" : "Save Welcome Message"}
              </button>
            </form>
          </Section>

        </div>
      </div>
    </div>
  );
}
