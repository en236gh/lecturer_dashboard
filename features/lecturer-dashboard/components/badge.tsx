export function Badge({ status }: { status: string }) {
  const tone =
    status === "PRESENT" ||
    status === "COMPLETED" ||
    status === "Allocated" ||
    status === "Registered"
      ? "bg-unza-green/10 text-unza-green"
      : status === "ABSENT"
        ? "bg-unza-red/10 text-unza-red"
        : status === "LATE" || status === "IN_PROGRESS"
          ? "bg-unza-gold/20 text-amber-800"
          : status === "WRONG_VENUE"
            ? "bg-red-50 text-red-700"
            : "bg-surface-muted text-muted";

  return (
    <span
      className={`inline-flex rounded-[10px] px-2.5 py-1 text-[11px] font-semibold tracking-wide ${tone}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
