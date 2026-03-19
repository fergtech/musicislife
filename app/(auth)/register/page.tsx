"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Registration failed.");
      setLoading(false);
      return;
    }

    // Auto-login after registration
    await signIn("credentials", { email, password, redirect: false });
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h1 className="text-lg font-semibold">Create account</h1>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-400" htmlFor="name">
          Name <span className="text-neutral-600">(optional)</span>
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-400" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-400" htmlFor="password">
          Password <span className="text-neutral-600">(min 8 chars)</span>
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-neutral-400">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
