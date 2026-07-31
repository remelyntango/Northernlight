import Image from "next/image";
import { cx, initialsOf } from "@/lib/utils";

const SIZES = {
  sm: "h-9 w-9 text-[13px]",
  md: "h-[38px] w-[38px] text-[13px]",
  lg: "h-14 w-14 text-base",
} as const;

const PX = { sm: 36, md: 38, lg: 56 } as const;

/** Green initials circle from the mockup, upgraded to show an uploaded avatar
 *  when the profile has one. */
export function Avatar({
  name,
  src,
  size = "sm",
  className,
}: {
  name: string | null | undefined;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const base = cx(
    "relative shrink-0 overflow-hidden rounded-full",
    SIZES[size],
    className,
  );

  if (src) {
    return (
      <span className={base}>
        <Image
          src={src}
          alt={name ?? "Member"}
          width={PX[size]}
          height={PX[size]}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cx(
        base,
        "flex items-center justify-center bg-accent font-semibold text-on-primary",
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
