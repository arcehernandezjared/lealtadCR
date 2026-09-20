import type { HTMLAttributes } from "react";
import clsx from "clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-ink-100 bg-white p-6 shadow-card transition-shadow hover:shadow-card-hover",
        className
      )}
      {...props}
    />
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="hover:shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-ink-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
