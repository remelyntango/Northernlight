import { cx } from "@/lib/utils";

/** Content-type pill. Terracotta for articles, green for discussions —
 *  the mockup's only visual cue distinguishing the two in a mixed feed. */
export function Badge({
  tone = "primary",
  children,
  className,
}: {
  tone?: "primary" | "accent" | "neutral";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-[10px] px-2.5 py-[3px] text-xs font-semibold",
        tone === "primary" && "bg-primary-tint text-primary-ink",
        tone === "accent" && "bg-accent-tint text-accent-ink",
        tone === "neutral" && "border border-border bg-subtle text-ink-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
