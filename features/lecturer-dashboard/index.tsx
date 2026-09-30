"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { bootstrapSession, clearSession, hasSession } from "@/lib/api";
import { AppShell } from "./components/app-shell";
import { Login } from "./components/login";
import { LoginSkeleton } from "./components/skeleton";

export default function LecturerDashboard() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [accountVersion, setAccountVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function initSession() {
      if (!hasSession()) {
        if (!cancelled) {
          setAuthenticated(false);
          setReady(true);
        }
        return;
      }

      try {
        const sessionReady = await bootstrapSession();
        if (!cancelled) {
          setAuthenticated(sessionReady && hasSession());
          setAuthError("");
        }
      } catch (reason) {
        if (!cancelled) {
          setAuthenticated(false);
          setAuthError(reason instanceof Error ? reason.message : "Your session has expired. Please sign in again.");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    function onSessionCleared() {
      setAuthenticated(false);
    }
    function onSessionRestored() {
      setAuthenticated(hasSession());
    }
    window.addEventListener("unza-session-cleared", onSessionCleared);
    window.addEventListener("unza-session-restored", onSessionRestored);
    function onAccountChanged() {
      setAccountVersion(version => version + 1);
      setAuthenticated(hasSession());
    }
    function onStorage(event: StorageEvent) {
      if (
        event.key === null ||
        event.key === "unza-lecturer-email" ||
        (event.key === "unza-lecturer-refresh-token" && event.newValue === null)
      ) onAccountChanged();
    }
    window.addEventListener("unza-account-changed", onAccountChanged);
    window.addEventListener("storage", onStorage);
    void initSession();
    return () => {
      cancelled = true;
      window.removeEventListener("unza-session-cleared", onSessionCleared);
      window.removeEventListener("unza-session-restored", onSessionRestored);
      window.removeEventListener("unza-account-changed", onAccountChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (!ready) {
    return <LoginSkeleton />;
  }

  if (!authenticated) {
    return (
      <>
        <Login onAuthenticated={() => { setAuthError(""); setAuthenticated(true); }} initialError={authError} />
        <Toaster position="top-right" richColors closeButton />
      </>
    );
  }

  return (
    <AppShell
      key={accountVersion}
      onSignOut={() => {
        clearSession();
        setAuthenticated(false);
      }}
    />
  );
}
