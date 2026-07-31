import type { Metadata } from "next";
import Link from "next/link";
import { ChipLink } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/Card";
import { FeedCard } from "@/components/content/FeedCard";
import { Pagination } from "@/components/content/Pagination";
import { getArticles } from "@/lib/queries";
import { CATEGORIES, COUNTRIES, PAGE_SIZE } from "@/lib/constants";
import { autoExcerpt } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Articles",
  description:
    "Guides and first-hand accounts of living in Denmark, Norway and Sweden.",
};

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;

  const country = COUNTRIES.some((c) => c.value === params.country)
    ? params.country!
    : "all";
  const category = CATEGORIES.includes(params.category as never)
    ? params.category
    : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const { items, total } = await getArticles({ country, category, page });

  /** Preserve the other filters when building a chip's href. */
  function href(next: { country?: string; category?: string }) {
    const sp = new URLSearchParams();
    const c = next.country ?? country;
    const cat = "category" in next ? next.category : category;
    if (c && c !== "all") sp.set("country", c);
    if (cat) sp.set("category", cat);
    const qs = sp.toString();
    return qs ? `/articles?${qs}` : "/articles";
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 pb-24 pt-14">
      <header className="mb-7">
        <h1 className="mb-2 font-serif text-[34px] font-medium text-ink">
          Articles
        </h1>
        <p className="text-[15px] text-ink-muted">
          Guides and first-hand accounts from people who have already made the
          move.
        </p>
      </header>

      <nav aria-label="Filter by country" className="mb-3 flex flex-wrap gap-2.5">
        {COUNTRIES.map((c) => (
          <ChipLink
            key={c.value}
            href={href({ country: c.value })}
            active={country === c.value}
          >
            {c.label}
          </ChipLink>
        ))}
      </nav>

      <nav aria-label="Filter by topic" className="mb-8 flex flex-wrap gap-2.5">
        <ChipLink href={href({ category: undefined })} active={!category}>
          All topics
        </ChipLink>
        {CATEGORIES.map((c) => (
          <ChipLink key={c} href={href({ category: c })} active={category === c}>
            {c}
          </ChipLink>
        ))}
      </nav>

      {items.length > 0 ? (
        <>
          <div className="flex flex-col gap-5">
            {items.map((article) => (
              <FeedCard
                key={article.id}
                item={{
                  kind: "article",
                  id: article.id,
                  title: article.title,
                  slug: article.slug,
                  excerpt: autoExcerpt(article.excerpt ?? article.body_md),
                  category: article.category,
                  country: article.country,
                  author: article.author,
                  like_count: article.like_count,
                  comment_count: article.comment_count,
                  published_at: article.published_at ?? article.created_at,
                  cover_url: article.cover_url,
                  reading_time: null,
                }}
              />
            ))}
          </div>

          <Pagination
            page={page}
            total={total}
            pageSize={PAGE_SIZE}
            basePath={href({})}
          />
        </>
      ) : (
        <EmptyState title="No articles match those filters">
          <Link href="/articles" className="font-semibold text-primary-link underline">
            Clear the filters
          </Link>{" "}
          to see everything.
        </EmptyState>
      )}
    </div>
  );
}
