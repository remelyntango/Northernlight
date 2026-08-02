import Link from "next/link";
import { cx } from "@/lib/utils";

/** Filter pill. Active chips get the gradient and sit lower; inactive ones are
 *  raised, so the selected filter reads as "pressed in". Rendered as a link so
 *  filtering works without JavaScript and each state is a real URL. */
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
        "inline-flex items-center rounded-[16px] px-[18px] py-2.5 text-sm font-semibold",
        "transition-all duration-150",
        active
          ? "grad-primary neu-xs text-on-primary"
          : "neu-sm neu-press bg-surface text-ink-label hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}

/** Article footer tags. The mockup cycles three tints rather than using one
 *  neutral pill, so tags read as a colourful set. */
const TAG_TONES = [
  "bg-primary-tint text-primary-ink",
  "bg-primary-edge text-primary-link",
  "bg-accent-tint text-accent-ink",
] as const;

export function Tag({
  children,
  index = 0,
}: {
  children: React.ReactNode;
  index?: number;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-[12px] px-3.5 py-1.5 text-[13px] font-semibold",
        TAG_TONES[index % TAG_TONES.length],
      )}
    >
      {children}
    </span>
  );
}
