import { type InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-ink-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            "h-11 rounded-xl border border-ink-200 bg-white px-3.5 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-400",
            "focus:border-brand-500 focus:ring-4 focus:ring-brand-100",
            error && "border-red-400 focus:border-red-500 focus:ring-red-100",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs font-medium text-red-600">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";
