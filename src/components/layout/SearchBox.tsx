"use client";

import { useSearchParams } from "next/navigation";
import { cx } from "@/lib/utils";

/**
 * Plain GET form targeting /search — works with JavaScript disabled and makes
 * every search a shareable URL. Search is public, so this renders for signed-out
 * visitors too.
 */
export function SearchBox({
  className,
  autoFocus = false,
  placeholder = "Search…",
}: {
  className?: string;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const params = useSearchParams();
  const current = params.get("q") ?? "";

  return (
    <form
      action="/search"
      method="get"
      role="search"
      className={cx(
        "flex items-center gap-2 rounded-[20px] border border-border bg-subtle px-3.5 py-2",
        "focus-within:border-primary",
        className,
      )}
    >
      <span aria-hidden="true" className="shrink-0 text-sm text-ink-muted">
        ⌕
      </span>
      <label className="sr-only" htmlFor="site-search">
        Search articles, discussions and comments
      </label>
      <input
        id="site-search"
        type="search"
        name="q"
        defaultValue={current}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent text-sm text-ink outline-none"
      />
    </form>
  );
}
