import { cx } from "@/lib/utils";

/** Content-type pill. Coral for articles, teal for discussions — the only cue
 *  distinguishing the two in a mixed feed. */
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
        "inline-flex items-center rounded-[10px] px-3 py-1 text-xs font-bold",
        tone === "primary" && "bg-primary-tint text-primary-ink",
        tone === "accent" && "bg-accent-tint text-accent-ink",
        tone === "neutral" && "neu-inset bg-surface text-ink-soft",
        className,
      )}
    >
      {children}
    </span>
  );
}
