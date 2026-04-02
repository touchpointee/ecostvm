"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Enter username and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm rounded-2xl border-2 border-black bg-white p-6 shadow-lg">
        <h1 className="text-xl font-bold text-black">Admin Login</h1>
        <p className="mt-1 text-sm text-black/70">
          Enter your credentials to access the portal.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="adminUsername" className="block text-sm font-medium text-black">
              Username
            </label>
            <input
              id="adminUsername"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2.5 text-black placeholder:text-black/50 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              autoFocus
              required
            />
          </div>
          <div>
            <label htmlFor="adminPassword" className="block text-sm font-medium text-black">
              Password
            </label>
            <input
              id="adminPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="mt-1 block w-full rounded-lg border-2 border-black bg-white px-3 py-2.5 text-black placeholder:text-black/50 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
            />
          </div>
          {error && <p className="text-sm text-black">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-yellow-400 py-3 font-semibold text-black hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-70"
          >
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
