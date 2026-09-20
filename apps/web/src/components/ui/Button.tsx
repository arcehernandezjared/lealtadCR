import { type ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-ink-900 text-white hover:bg-ink-800 shadow-card active:scale-[0.98] disabled:bg-ink-300",
  secondary:
    "bg-brand-600 text-white hover:bg-brand-700 shadow-card active:scale-[0.98] disabled:bg-brand-300",
  outline:
    "border border-ink-200 bg-white text-ink-800 hover:border-ink-300 hover:bg-ink-50 active:scale-[0.98]",
  ghost: "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-lg",
  md: "h-10 px-4 text-sm rounded-xl",
  lg: "h-12 px-6 text-base rounded-xl",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-70",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";
