export function MiniStat({
  label,
  value,
  good,
  warn,
}: {
  label: string;
  value: number;
  good?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-[10px] bg-surface-muted p-5">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`mt-2 text-4xl font-bold tabular-nums ${
          good ? "text-unza-green" : warn && value ? "text-unza-red" : ""
        }`}
      >
        {String(value).padStart(2, "0")}
      </p>
    </div>
  );
}
