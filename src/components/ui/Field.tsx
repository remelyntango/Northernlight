import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/utils";

/* Inputs are carved into the surface rather than outlined. That leaves them
   without a real border, so the focus ring in globals.css is what makes them
   identifiable to keyboard users — don't remove it. */
const CONTROL =
  "neu-inset w-full rounded-[14px] bg-surface px-4 py-3 text-[14.5px] text-ink " +
  "transition-shadow placeholder:text-ink-soft";

export function Label({
  children,
  htmlFor,
  hint,
}: {
  children: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 flex items-baseline justify-between gap-3 text-[13px] font-semibold text-ink-label"
    >
      <span>{children}</span>
      {hint ? (
        <span className="text-[12px] font-normal text-ink-soft">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cx(CONTROL, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cx(CONTROL, "resize-y leading-relaxed", className)}
      {...rest}
    />
  );
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select className={cx(CONTROL, "cursor-pointer", className)} {...rest}>
      {children}
    </select>
  );
}

/** Inline validation / server-action error text. */
export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-2 text-[13px] font-medium text-danger">
      {children}
    </p>
  );
}

/** Form-level error banner. */
export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="neu-inset rounded-[14px] bg-surface px-4 py-3 text-[14px] font-medium text-danger"
    >
      {children}
    </p>
  );
}

export function FormNotice({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-[14px] bg-accent-tint px-4 py-3 text-[14px] font-medium text-accent-ink">
      {children}
    </p>
  );
}
