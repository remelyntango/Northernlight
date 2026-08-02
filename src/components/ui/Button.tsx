import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

/** Raised by default, depressed on press — in this style the lighting is the
 *  affordance, so interaction has to change it. */
const VARIANTS: Record<Variant, string> = {
  primary: "grad-primary text-on-primary neu-xs neu-press hover:brightness-110",
  secondary: "bg-surface text-ink-label neu-sm neu-press hover:text-ink",
  ghost: "bg-transparent text-ink hover:text-primary-ink",
  danger: "bg-surface text-danger neu-sm neu-press hover:brightness-105",
};

const SIZES: Record<Size, string> = {
  sm: "text-[13px] px-4 py-2 rounded-[13px]",
  md: "text-sm px-[18px] py-2.5 rounded-[16px]",
  lg: "text-[15px] px-6 py-3 rounded-[18px]",
};

function classes(variant: Variant, size: Size, full: boolean, extra?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 font-semibold",
    "transition-all duration-150 cursor-pointer whitespace-nowrap",
    "disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-none",
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
    <button className={classes(variant, size, fullWidth, className)} {...rest}>
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

/** Form submit button — same gradient, squarer radius to sit beside inputs. */
export function SubmitButton({
  className,
  children,
  ...rest
}: ComponentProps<"button">) {
  return (
    <button
      className={cx(
        "inline-flex cursor-pointer items-center justify-center rounded-[14px] px-[18px] py-[13px]",
        "grad-primary neu-xs neu-press text-[15px] font-semibold text-on-primary",
        "transition-all duration-150 hover:brightness-110",
        "disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
