import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/utils";

const CONTROL =
  "w-full rounded-[10px] border border-border bg-surface px-3.5 py-3 text-[14.5px] text-ink " +
  "transition-colors placeholder:text-ink-soft focus:border-primary";

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
      className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px] font-semibold text-ink-label"
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
    <textarea className={cx(CONTROL, "resize-y leading-relaxed", className)} {...rest} />
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
    <p role="alert" className="mt-1.5 text-[13px] text-danger">
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
      className="rounded-[10px] border border-danger/30 bg-danger/8 px-3.5 py-3 text-[14px] text-danger"
    >
      {children}
    </p>
  );
}

export function FormNotice({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-[10px] border border-accent/30 bg-accent-tint px-3.5 py-3 text-[14px] text-accent-ink">
      {children}
    </p>
  );
}
