"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { signOut } from "@/app/actions/auth";
import type { Profile } from "@/lib/types";

export function UserMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const item =
    "block w-full px-4 py-2.5 text-left text-sm text-ink-strong transition-colors hover:bg-subtle";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${profile.display_name}`}
        className="flex cursor-pointer items-center rounded-full transition-opacity hover:opacity-85"
      >
        <Avatar name={profile.display_name} src={profile.avatar_url} size="sm" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-30 w-56 overflow-hidden neu rounded-[18px] bg-surface py-1.5"
        >
          <div className="border-b border-border px-4 pb-2.5 pt-1.5">
            <p className="truncate text-sm font-semibold text-ink">
              {profile.display_name}
            </p>
            <p className="text-xs text-ink-soft">
              {profile.role === "admin" ? "Administrator" : "Member"}
            </p>
          </div>

          <Link href="/write" role="menuitem" className={item} onClick={() => setOpen(false)}>
            Write an article
          </Link>
          <Link
            href="/discussions/new"
            role="menuitem"
            className={item}
            onClick={() => setOpen(false)}
          >
            Start a discussion
          </Link>
          <Link href="/settings" role="menuitem" className={item} onClick={() => setOpen(false)}>
            Your posts &amp; profile
          </Link>
          {profile.role === "admin" ? (
            <Link href="/admin" role="menuitem" className={item} onClick={() => setOpen(false)}>
              Moderation
            </Link>
          ) : null}

          <form action={signOut} className="border-t border-border pt-1.5">
            <button type="submit" role="menuitem" className={`${item} cursor-pointer`}>
              Log out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
