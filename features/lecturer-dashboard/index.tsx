"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { bootstrapSession, clearSession, hasSession } from "@/lib/api";
import { AppShell } from "./components/app-shell";
import { Login } from "./components/login";
import { AppShellSkeleton } from "./components/skeleton";

export default function LecturerDashboard() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
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
        await bootstrapSession();
      } catch {
        // Keep the user signed in when refresh fails transiently; only logout if tokens were revoked.
      }

      if (!cancelled) {
        setAuthenticated(hasSession());
        setReady(true);
      }
    }

    void initSession();

    function onSessionCleared() {
      setAuthenticated(false);
    }
    window.addEventListener("unza-session-cleared", onSessionCleared);
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
    return () => {
      cancelled = true;
      window.removeEventListener("unza-session-cleared", onSessionCleared);
      window.removeEventListener("unza-account-changed", onAccountChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (!ready) {
    return <AppShellSkeleton />;
  }

  if (!authenticated) {
    return (
      <>
        <Login onAuthenticated={() => setAuthenticated(true)} />
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
