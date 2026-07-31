import { cx } from "@/lib/utils";

export function Card({
  as: Tag = "div",
  className,
  children,
}: {
  as?: "div" | "article" | "section" | "aside";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag
      className={cx(
        "rounded-[14px] border border-border bg-surface p-6",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-serif text-base font-medium text-ink">{children}</h2>
  );
}

/** Diagonal-hatch placeholder from the mockup, shown where a cover image
 *  would be. Also the graceful fallback when an article has no cover. */
export function ImagePlaceholder({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex items-end rounded-[14px] p-4",
        "bg-[repeating-linear-gradient(135deg,oklch(0.93_0.02_70),oklch(0.93_0.02_70)_12px,oklch(0.895_0.02_70)_12px,oklch(0.895_0.02_70)_24px)]",
        className,
      )}
    >
      <span className="rounded-md bg-surface/85 px-2.5 py-1 font-mono text-xs text-ink-label">
        {label}
      </span>
    </div>
  );
}

/** Consistent empty-state block for feeds, lists and search. */
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
      <p className="font-serif text-lg font-medium text-ink">{title}</p>
      {children ? (
        <div className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
          {children}
        </div>
      ) : null}
    </div>
  );
}
