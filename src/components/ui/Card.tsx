import { cx } from "@/lib/utils";

/** Raised panel. No border — the shadow pair is the edge. */
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
    <Tag className={cx("neu rounded-[20px] bg-surface p-6", className)}>
      {children}
    </Tag>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-base font-semibold text-ink">{children}</h2>
  );
}

/** Stands in for a cover image. The previous design used a hatched grey; this
 *  one uses the teal→coral gradient, so an article without a cover still looks
 *  deliberate rather than broken. */
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
        "neu flex items-end rounded-[22px] p-4",
        "bg-[linear-gradient(135deg,oklch(0.8_0.13_190),oklch(0.78_0.16_30))]",
        className,
      )}
    >
      <span className="rounded-lg bg-canvas/85 px-2.5 py-1 font-mono text-xs text-ink-strong">
        {label}
      </span>
    </div>
  );
}

/** Empty states are carved in rather than raised — nothing is there, so it
 *  should read as a recess, not an object. */
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="neu-inset rounded-[20px] bg-surface px-6 py-12 text-center">
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {children ? (
        <div className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
          {children}
        </div>
      ) : null}
    </div>
  );
}
