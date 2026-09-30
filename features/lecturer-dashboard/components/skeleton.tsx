import { Brand } from "./brand";

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[10px] bg-surface-muted ${className}`}
      aria-hidden
    />
  );
}

export function LoginSkeleton() {
  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2" aria-busy="true" aria-label="Loading sign-in">
      <div className="grid min-h-[220px] place-items-center bg-ink px-6 lg:min-h-screen">
        <Brand inverse />
      </div>
      <div className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-3 h-4 w-full max-w-sm" />
          <Skeleton className="mt-2 h-4 w-3/4 max-w-xs" />
          <div className="mt-8 space-y-5">
            <div>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-2 h-11 w-full rounded-md" />
            </div>
            <div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-2 h-11 w-full rounded-md" />
            </div>
            <Skeleton className="h-11 w-full rounded-md bg-ink/15" />
          </div>
          <Skeleton className="mt-5 h-4 w-44" />
          <Skeleton className="mt-12 h-px w-full" />
          <Skeleton className="mt-5 h-3 w-full max-w-sm" />
        </div>
      </div>
    </main>
  );
}

function DashboardContentSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="min-h-44 rounded-[10px] bg-white p-5 shadow-panel md:p-6"
          >
            <div className="mb-8 flex items-center justify-between">
              <Skeleton className="h-11 w-11" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-3 h-10 w-24" />
          </div>
        ))}
      </div>
      <div>
        <Skeleton className="h-5 w-28" />
        <Skeleton className="mt-2 h-4 w-64" />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="min-h-36 rounded-[10px] bg-white p-5 shadow-panel"
            >
              <Skeleton className="h-6 w-6" />
              <Skeleton className="mt-5 h-5 w-40" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-1 h-4 w-4/5" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="h-5 w-56" />
        <Skeleton className="mt-2 h-4 w-72" />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="rounded-[10px] bg-white p-5 shadow-panel">
              <div className="flex items-start justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="mt-4 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-3/4" />
              <div className="mt-5 flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="min-h-screen bg-app" aria-busy="true" aria-label="Loading">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[290px] flex-col rounded-r-[10px] bg-white px-5 py-7 shadow-sidebar lg:flex">
        <div className="flex flex-col items-center">
          <Skeleton className="h-28 w-28 rounded-full" />
          <Skeleton className="mt-3 h-3 w-36" />
        </div>
        <nav className="mt-9 space-y-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </nav>
        <div className="mt-auto border-t border-black/6 pt-5">
          <Skeleton className="h-12 w-full" />
        </div>
      </aside>
      <main className="min-h-screen p-4 lg:pl-[322px] lg:pr-8 lg:pt-8">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 lg:hidden" />
            <div>
              <Skeleton className="h-9 w-48 md:h-10 md:w-64" />
              <Skeleton className="mt-2 hidden h-4 w-72 md:block" />
            </div>
          </div>
          <Skeleton className="hidden h-12 max-w-md flex-1 md:block" />
          <div className="flex items-center gap-3 rounded-[10px] bg-white/70 p-2 pr-3 shadow-panel">
            <Skeleton className="h-10 w-10" />
            <div className="hidden space-y-1 sm:block">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </header>
        <DashboardContentSkeleton />
      </main>
    </div>
  );
}
