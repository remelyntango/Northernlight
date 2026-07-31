"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/articles", label: "Articles" },
  { href: "/discussions", label: "Discussions" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <div className={cx("flex items-center gap-[18px]", className)}>
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "text-[15px] transition-colors",
              active
                ? "font-bold text-primary-ink"
                : "font-medium text-ink-strong hover:text-primary-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
