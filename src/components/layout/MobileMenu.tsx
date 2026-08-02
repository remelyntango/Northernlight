"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_ITEMS } from "@/components/layout/NavLinks";
import { SearchBox } from "@/components/layout/SearchBox";
import { cx } from "@/lib/utils";

/** The mockup is desktop-only at 1440px; this carries the same navigation on
 *  narrow screens. */
export function MobileMenu({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();

  // Storing *which* path the menu was opened on means navigating anywhere
  // closes it for free, with no effect and no cascading render.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const setOpen = (next: boolean) => setOpenPath(next ? pathname : null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="neu-sm neu-press flex h-10 w-10 cursor-pointer items-center justify-center rounded-[14px] bg-surface text-ink md:hidden"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          {open ? "×" : "≡"}
        </span>
      </button>

      {open ? (
        <div className="fixed inset-x-0 top-[76px] z-30 border-b border-border bg-surface px-6 py-5 md:hidden">
          <SearchBox className="mb-5 w-full" />
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    "rounded-lg px-3 py-2.5 text-base transition-colors",
                    active
                      ? "bg-primary-tint font-semibold text-primary-ink"
                      : "font-medium text-ink-strong hover:bg-subtle",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            {signedIn ? (
              <>
                <Link
                  href="/write"
                  className="rounded-lg px-3 py-2.5 text-base font-medium text-ink-strong hover:bg-subtle"
                >
                  Write an article
                </Link>
                <Link
                  href="/discussions/new"
                  className="rounded-lg px-3 py-2.5 text-base font-medium text-ink-strong hover:bg-subtle"
                >
                  Start a discussion
                </Link>
                <Link
                  href="/settings"
                  className="rounded-lg px-3 py-2.5 text-base font-medium text-ink-strong hover:bg-subtle"
                >
                  Your posts &amp; profile
                </Link>
              </>
            ) : null}
          </nav>
        </div>
      ) : null}
    </>
  );
}
