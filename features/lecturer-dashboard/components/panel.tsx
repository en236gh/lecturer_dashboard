import type { ReactNode } from "react";

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[10px] bg-white p-5 shadow-panel md:p-6 ${className}`}>
      {children}
    </section>
  );
}
