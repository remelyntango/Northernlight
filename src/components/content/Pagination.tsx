import Link from "next/link";
import { cx } from "@/lib/utils";

/** Prev/next pager that keeps whatever filters are already in `basePath`. */
export function Pagination({
  page,
  total,
  pageSize,
  basePath,
}: {
  page: number;
  total: number;
  pageSize: number;
  basePath: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  function href(target: number) {
    const [path, query = ""] = basePath.split("?");
    const sp = new URLSearchParams(query);
    if (target > 1) sp.set("page", String(target));
    else sp.delete("page");
    const qs = sp.toString();
    return qs ? `${path}?${qs}` : path;
  }

  const link =
    "rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-border-strong";
  const disabled =
    "rounded-full border border-border bg-subtle px-4 py-2 text-sm font-semibold text-ink-soft";

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-between gap-4"
    >
      {page > 1 ? (
        <Link href={href(page - 1)} className={link} rel="prev">
          ← Newer
        </Link>
      ) : (
        <span className={cx(disabled, "cursor-not-allowed")}>← Newer</span>
      )}

      <span className="text-[13px] text-ink-muted">
        Page {page} of {pages}
      </span>

      {page < pages ? (
        <Link href={href(page + 1)} className={link} rel="next">
          Older →
        </Link>
      ) : (
        <span className={cx(disabled, "cursor-not-allowed")}>Older →</span>
      )}
    </nav>
  );
}
