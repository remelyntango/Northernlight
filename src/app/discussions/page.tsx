import type { Metadata } from "next";
import Link from "next/link";
import { ChipLink } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { ThreadRow } from "@/components/content/ThreadRow";
import { Pagination } from "@/components/content/Pagination";
import { getThreads } from "@/lib/queries";
import { getCurrentProfile } from "@/lib/auth";
import { CATEGORIES, COUNTRIES, PAGE_SIZE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Discussions",
  description:
    "Ask questions, share tips and meet people who get it — expats across Denmark, Norway and Sweden.",
};

export default async function DiscussionsPage({
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

  const [{ items, total }, profile] = await Promise.all([
    getThreads({ country, category, page }),
    getCurrentProfile(),
  ]);

  function href(next: { country?: string; category?: string }) {
    const sp = new URLSearchParams();
    const c = next.country ?? country;
    const cat = "category" in next ? next.category : category;
    if (c && c !== "all") sp.set("country", c);
    if (cat) sp.set("category", cat);
    const qs = sp.toString();
    return qs ? `/discussions?${qs}` : "/discussions";
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 pb-24 pt-14">
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mb-2 font-serif text-[34px] font-medium text-ink">
            Discussions
          </h1>
          <p className="text-[15px] text-ink-muted">
            Ask questions, share tips, meet people who get it.
          </p>
        </div>

        {profile ? (
          <ButtonLink href="/discussions/new" className="self-start">
            + Start a thread
          </ButtonLink>
        ) : (
          <ButtonLink
            href="/login?next=%2Fdiscussions%2Fnew"
            variant="secondary"
            className="self-start"
          >
            Log in to post
          </ButtonLink>
        )}
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

      <nav aria-label="Filter by topic" className="mb-7 flex flex-wrap gap-2.5">
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
          <div className="flex flex-col">
            {items.map((thread) => (
              <ThreadRow key={thread.id} thread={thread} />
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
        <EmptyState title="No discussions here yet">
          {category || country !== "all" ? (
            <>
              <Link
                href="/discussions"
                className="font-semibold text-primary-link underline"
              >
                Clear the filters
              </Link>{" "}
              to see everything, or start the first thread on this topic.
            </>
          ) : (
            <>Be the first to ask a question.</>
          )}
        </EmptyState>
      )}
    </div>
  );
}
