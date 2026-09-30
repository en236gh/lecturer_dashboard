"use client";

import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { activateAccount, login, saveSession } from "@/lib/api";
import { Brand } from "./brand";

export function Login({ onAuthenticated, initialError = "" }: { onAuthenticated: () => void; initialError?: string }) {
  const [mode, setMode] = useState<"login" | "activate">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    if (password.length < 8) return setError("Password must contain at least 8 characters.");
    setLoading(true);
    try {
      if (mode === "activate") {
        const confirmation = String(data.get("confirmPassword") ?? "");
        if (password !== confirmation) throw new Error("Passwords do not match.");
        await activateAccount(email, password, confirmation);
        toast.success("Account activated. You can now sign in.");
        setMode("login");
      } else {
        const result = await login(email, password);
        saveSession(result.accessToken, result.refreshToken, email);
        onAuthenticated();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not complete your request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      <div className="grid min-h-[220px] place-items-center bg-ink px-6 lg:min-h-screen">
        <Brand inverse />
      </div>
      <div className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {mode === "login" ? "Sign in As Lecturer" : "Activate your account"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {mode === "login"
              ? "Use your institutional account to manage examinations."
              : "Set a password for the pending account provisioned by your administrator."}
          </p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block text-sm font-medium">
              Email address
              <input
                name="email"
                required
                type="email"
                className="auth-input mt-2"
                placeholder="name@unza.zm"
              />
            </label>
            <label className="block text-sm font-medium">
              Password
              <span className="relative mt-2 block">
                <input
                  name="password"
                  required
                  type={showPassword ? "text" : "password"}
                  className="auth-input pr-12"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 px-4 text-muted"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </span>
            </label>
            {mode === "activate" && (
              <label className="block text-sm font-medium">
                Confirm password
                <input
                  name="confirmPassword"
                  required
                  type="password"
                  className="auth-input mt-2"
                  placeholder="Repeat your password"
                />
              </label>
            )}
            {error && <p className="text-sm text-unza-red">{error}</p>}
            <button
              disabled={loading}
              className="h-11 w-full bg-ink px-4 text-sm font-medium text-white transition hover:bg-black/85 disabled:opacity-60"
            >
              {loading
                ? "Please wait…"
                : mode === "login"
                  ? "Sign in"
                  : "Activate account"}
            </button>
          </form>
          <div className="mt-5 text-sm">
            <button
              onClick={() => {
                setMode(mode === "login" ? "activate" : "login");
                setError("");
              }}
              className="font-medium text-ink underline-offset-4 hover:underline"
            >
              {mode === "login" ? "Activate a new account" : "Return to sign in"}
            </button>
          </div>
          <p className="mt-12 border-t border-black/8 pt-5 text-xs leading-5 text-muted">
            For account access assistance, contact the Directorate of Information and
            Communication Technology.
          </p>
        </div>
      </div>
    </main>
  );
}
