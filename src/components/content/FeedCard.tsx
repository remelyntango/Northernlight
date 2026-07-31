import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { countryLabel } from "@/lib/constants";
import { pluralize, timeAgo } from "@/lib/utils";
import type { FeedItem } from "@/lib/types";

/** One entry in the mixed home feed. The badge tone is the only thing telling
 *  an article apart from a discussion, exactly as in the mockup. */
export function FeedCard({ item }: { item: FeedItem }) {
  const isArticle = item.kind === "article";
  const href = isArticle
    ? `/articles/${item.slug}`
    : `/discussions/${item.slug}`;

  return (
    <article className="rounded-[14px] border border-border bg-surface p-6 transition-colors hover:border-border-strong">
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <Badge tone={isArticle ? "primary" : "accent"}>
          {isArticle ? "Article" : "Discussion"}
        </Badge>
        <span className="text-[13px] text-ink-muted">{item.category}</span>
        <span aria-hidden="true" className="text-[13px] text-ink-soft">
          ·
        </span>
        <span className="text-[13px] text-ink-muted">
          {countryLabel(item.country)}
        </span>
      </div>

      {item.cover_url ? (
        <Link href={href} className="mb-4 block overflow-hidden rounded-[10px]">
          <Image
            src={item.cover_url}
            alt=""
            width={760}
            height={200}
            className="h-[168px] w-full object-cover"
          />
        </Link>
      ) : null}

      <h2 className="mb-2 font-serif text-[21px] font-medium leading-[1.3] text-ink">
        <Link href={href} className="transition-colors hover:text-primary-ink">
          {item.title}
        </Link>
      </h2>

      <p className="mb-3.5 text-[14.5px] leading-[1.55] text-ink-muted">
        {item.excerpt}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-muted">
        <span>{item.author?.display_name ?? "Community"}</span>
        <span aria-hidden="true">·</span>
        <span>
          {isArticle
            ? (item.reading_time ?? "Article")
            : pluralize(item.comment_count, "reply", "replies")}
        </span>
        <span aria-hidden="true">·</span>
        <span>{timeAgo(item.published_at)}</span>
      </div>
    </article>
  );
}
