import Link from "next/link";
import { cx } from "@/lib/utils";

/** Filter pill from the mockup's `chipStyle(active)`. Rendered as a link so
 *  filtering works without JavaScript and each filter state is a real URL. */
export function ChipLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cx(
        "inline-flex items-center rounded-[18px] border px-4 py-[9px] text-sm font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-on-primary"
          : "border-border bg-subtle text-ink-strong hover:border-border-strong hover:bg-surface",
      )}
    >
      {children}
    </Link>
  );
}

/** Non-interactive tag pill (article footer tags). */
export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-xl border border-border bg-subtle px-3 py-[5px] text-[13px] text-ink-strong">
      {children}
    </span>
  );
}
