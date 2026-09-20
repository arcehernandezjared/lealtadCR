import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex justify-center text-lg font-semibold tracking-tight text-ink-900">
          Loyalty<span className="text-brand-600">Cr</span>
        </Link>
        <div className="rounded-2xl border border-ink-100 bg-white p-8 shadow-card">
          <h1 className="text-xl font-semibold tracking-tight text-ink-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
