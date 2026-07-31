import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary border border-primary hover:bg-primary-hover hover:border-primary-hover",
  secondary:
    "bg-subtle text-ink-label border border-border hover:bg-surface hover:text-ink",
  ghost:
    "bg-transparent text-ink border border-transparent hover:bg-subtle",
  danger:
    "bg-transparent text-danger border border-border hover:bg-danger hover:text-on-primary hover:border-danger",
};

const SIZES: Record<Size, string> = {
  sm: "text-[13px] px-3.5 py-1.5",
  md: "text-sm px-[18px] py-[9px]",
  lg: "text-[15px] px-6 py-3",
};

function classes(variant: Variant, size: Size, full: boolean, extra?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold",
    "transition-colors cursor-pointer whitespace-nowrap",
    "disabled:opacity-55 disabled:cursor-not-allowed",
    VARIANTS[variant],
    SIZES[size],
    full && "w-full",
    extra,
  );
}

interface BaseProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  children,
  ...rest
}: BaseProps & ComponentProps<"button">) {
  return (
    <button
      className={classes(variant, size, fullWidth, className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  children,
  ...rest
}: BaseProps & ComponentProps<typeof Link>) {
  return (
    <Link className={classes(variant, size, fullWidth, className)} {...rest}>
      {children}
    </Link>
  );
}

/** Square-cornered variant used inside forms, where the pill shape reads oddly
 *  next to rectangular inputs (matches the mockup's auth + comment buttons). */
export function SubmitButton({
  className,
  children,
  ...rest
}: ComponentProps<"button">) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center rounded-[10px] bg-primary px-[18px] py-[13px]",
        "text-[15px] font-semibold text-on-primary transition-colors",
        "hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
