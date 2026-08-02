import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Card";
import { SearchBox } from "@/components/layout/SearchBox";
import { search } from "@/lib/queries";
import { countryLabel } from "@/lib/constants";
import { pluralize, sanitizeSnippet, timeAgo } from "@/lib/utils";
import type { SearchResult } from "@/lib/types";

export const metadata: Metadata = {
  title: "Search",
  description: "Search articles, discussions and comments across Nordlys.",
  robots: { index: false },
};

const GROUPS = [
  { kind: "article", label: "Articles", tone: "primary" },
  { kind: "thread", label: "Discussions", tone: "accent" },
  { kind: "comment", label: "Comments", tone: "neutral" },
] as const;

function ResultRow({ result }: { result: SearchResult }) {
  return (
    <article className="border-b border-border py-5 last:border-b-0">
      <h3 className="mb-1.5 font-display text-[18px] font-medium leading-snug text-ink">
        <Link href={result.url} className="transition-colors hover:text-primary-ink">
          {result.title}
        </Link>
      </h3>

      {/* The snippet is ts_headline output: user-authored text with <mark>
          around the matched terms. The SQL escapes the body before
          highlighting, and sanitizeSnippet re-escapes and re-admits only
          <mark> — so this is the only tag that can reach the DOM. */}
      <p
        className="search-snippet text-[14.5px] leading-[1.55] text-ink-muted"
        dangerouslySetInnerHTML={{ __html: sanitizeSnippet(result.snippet) }}
      />

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-soft">
        <span>{result.author_name ?? "Community"}</span>
        <span aria-hidden="true">·</span>
        <span>{countryLabel(result.country)}</span>
        {result.category ? (
          <>
            <span aria-hidden="true">·</span>
            <span>{result.category}</span>
          </>
        ) : null}
        <span aria-hidden="true">·</span>
        <span>{timeAgo(result.created_at)}</span>
      </div>
    </article>
  );
}

async function Results({ q }: { q: string }) {
  const results = await search(q);

  if (results.length === 0) {
    return (
      <EmptyState title={`Nothing found for “${q}”`}>
        Try a broader term, or browse{" "}
        <Link href="/articles" className="font-semibold text-primary-link underline">
          all articles
        </Link>{" "}
        and{" "}
        <Link href="/discussions" className="font-semibold text-primary-link underline">
          all discussions
        </Link>
        .
      </EmptyState>
    );
  }

  return (
    <>
      <p className="mb-8 text-sm text-ink-muted">
        {pluralize(results.length, "result")} for{" "}
        <span className="font-semibold text-ink">“{q}”</span>
      </p>

      <div className="flex flex-col gap-10">
        {GROUPS.map((group) => {
          const rows = results.filter((r) => r.kind === group.kind);
          if (rows.length === 0) return null;

          return (
            <section key={group.kind}>
              <div className="mb-1 flex items-center gap-2.5">
                <h2 className="font-display text-[19px] font-medium text-ink">
                  {group.label}
                </h2>
                <Badge tone={group.tone}>{rows.length}</Badge>
              </div>
              <div className="flex flex-col">
                {rows.map((r) => (
                  <ResultRow key={`${r.kind}-${r.id}`} result={r} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  return (
    <div className="mx-auto max-w-[760px] px-6 pb-24 pt-14">
      <h1 className="mb-2 font-display text-[34px] font-medium text-ink">
        Search
      </h1>
      <p className="mb-6 text-[15px] text-ink-muted">
        Articles, discussions and comments — no account needed.
      </p>

      <Suspense>
        <SearchBox
          className="mb-10 w-full"
          autoFocus={!query}
          placeholder="Try “CPR”, “work permit”, “fika”…"
        />
      </Suspense>

      {query ? (
        <Suspense
          key={query}
          fallback={<p className="text-sm text-ink-muted">Searching…</p>}
        >
          <Results q={query} />
        </Suspense>
      ) : (
        <EmptyState title="What are you looking for?">
          Search across every article, discussion and comment on Nordlys.
        </EmptyState>
      )}
    </div>
  );
}
