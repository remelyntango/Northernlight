import Link from "next/link";
import { countryLabel } from "@/lib/constants";
import { autoExcerpt, pluralize, timeAgo } from "@/lib/utils";
import type { ThreadWithAuthor } from "@/lib/types";

/** Row in the Discussions list — matches the mockup's divider-separated layout
 *  with the reply count pinned right. */
export function ThreadRow({ thread }: { thread: ThreadWithAuthor }) {
  return (
    <article className="flex flex-col gap-3 border-b border-border py-5 sm:flex-row sm:items-center sm:gap-5">
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
          <span className="rounded-[10px] bg-accent-tint px-2.5 py-[3px] text-xs font-semibold text-accent-ink">
            {thread.category}
          </span>
          <span className="text-[12.5px] text-ink-soft">
            {countryLabel(thread.country)}
          </span>
        </div>

        <h2 className="mb-1.5 font-serif text-[18.5px] font-medium leading-snug text-ink">
          <Link
            href={`/discussions/${thread.slug}`}
            className="transition-colors hover:text-primary-ink"
          >
            {thread.title}
          </Link>
        </h2>

        <p className="text-sm leading-[1.5] text-ink-muted">
          {autoExcerpt(thread.body_md, 150)}
        </p>
      </div>

      <div className="shrink-0 sm:min-w-[110px] sm:text-right">
        <p className="text-[13.5px] text-ink-label">
          <b>{thread.comment_count}</b>{" "}
          {thread.comment_count === 1 ? "reply" : "replies"}
        </p>
        <p className="text-[12.5px] text-ink-soft">
          {timeAgo(thread.last_activity_at)}
        </p>
        <p className="mt-0.5 text-[12.5px] text-ink-soft sm:hidden">
          {pluralize(thread.like_count, "like")}
        </p>
      </div>
    </article>
  );
}
