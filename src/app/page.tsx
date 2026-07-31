import Link from "next/link";
import { ChipLink } from "@/components/ui/Chip";
import {
  Card,
  EmptyState,
  ImagePlaceholder,
  SectionHeading,
} from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { FeedCard } from "@/components/content/FeedCard";
import { getFeed, getTrendingThreads } from "@/lib/queries";
import { getCurrentProfile } from "@/lib/auth";
import { COUNTRIES } from "@/lib/constants";
import { pluralize } from "@/lib/utils";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const { country: rawCountry } = await searchParams;
  const country = COUNTRIES.some((c) => c.value === rawCountry)
    ? rawCountry!
    : "all";

  const [feed, trending, profile] = await Promise.all([
    getFeed({ country }),
    getTrendingThreads(3),
    getCurrentProfile(),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-[1280px] items-center gap-10 px-6 pb-10 pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
        <div>
          <h1 className="mb-4 font-serif text-[38px] font-medium leading-[1.15] tracking-[-0.3px] text-ink sm:text-[46px]">
            Find your footing
            <br />
            in Scandinavia.
          </h1>
          <p className="mb-7 max-w-[480px] text-[17px] leading-[1.6] text-ink-muted">
            Real stories, honest advice and a community of expats across
            Denmark, Norway and Sweden — from CPR numbers to fika etiquette.
          </p>
          <nav aria-label="Filter by country" className="flex flex-wrap gap-2.5">
            {COUNTRIES.map((c) => (
              <ChipLink
                key={c.value}
                href={c.value === "all" ? "/" : `/?country=${c.value}`}
                active={country === c.value}
              >
                {c.label}
              </ChipLink>
            ))}
          </nav>
        </div>

        <ImagePlaceholder
          label="photo — Nyhavn, Copenhagen"
          className="h-[220px] rounded-[18px] lg:h-[300px]"
        />
      </section>

      {/* Feed + sidebar */}
      <div className="mx-auto grid max-w-[1280px] gap-10 px-6 pb-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
        <section aria-label="Latest posts" className="flex flex-col gap-5">
          {feed.length > 0 ? (
            feed.map((item) => (
              <FeedCard key={`${item.kind}-${item.id}`} item={item} />
            ))
          ) : (
            <EmptyState title="Nothing here yet">
              {country === "all" ? (
                <>
                  Be the first to publish something.{" "}
                  <Link
                    href="/write"
                    className="font-semibold text-primary-link underline"
                  >
                    Write an article
                  </Link>{" "}
                  or{" "}
                  <Link
                    href="/discussions/new"
                    className="font-semibold text-primary-link underline"
                  >
                    start a discussion
                  </Link>
                  .
                </>
              ) : (
                <>
                  No posts for this country yet.{" "}
                  <Link
                    href="/"
                    className="font-semibold text-primary-link underline"
                  >
                    See all countries
                  </Link>
                  .
                </>
              )}
            </EmptyState>
          )}
        </section>

        <aside className="flex flex-col gap-5">
          <Card className="p-[22px]">
            <SectionHeading>Trending discussions</SectionHeading>
            {trending.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-3.5">
                {trending.map((thread) => (
                  <li key={thread.id}>
                    <Link
                      href={`/discussions/${thread.slug}`}
                      className="group block"
                    >
                      <p className="mb-1 text-[14.5px] font-medium leading-[1.4] text-ink transition-colors group-hover:text-primary-ink">
                        {thread.title}
                      </p>
                      <span className="text-[12.5px] text-ink-muted">
                        {pluralize(thread.comment_count, "reply", "replies")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-ink-muted">
                No discussions yet — start the first one.
              </p>
            )}
          </Card>

          <Card className="border-primary-edge bg-primary-tint p-[22px]">
            <SectionHeading>
              {profile ? "Share what you learned" : "Join the community"}
            </SectionHeading>
            <p className="mb-4 mt-2 text-sm leading-[1.5] text-ink-label">
              {profile
                ? "Your first week in a new country is someone else's hardest question."
                : "Create a free account to post articles, start threads and join the conversation."}
            </p>
            <ButtonLink href={profile ? "/write" : "/signup"}>
              {profile ? "Write a post" : "Sign up free"}
            </ButtonLink>
          </Card>
        </aside>
      </div>
    </>
  );
}
