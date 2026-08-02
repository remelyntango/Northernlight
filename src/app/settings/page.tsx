import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card, EmptyState } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { getMyArticles, getMyThreads } from "@/lib/queries";
import { getCurrentProfile } from "@/lib/auth";
import { formatDate, pluralize, timeAgo } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your posts & profile",
  robots: { index: false },
};

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/settings");

  const [articles, threads] = await Promise.all([
    getMyArticles(profile.id),
    getMyThreads(profile.id),
  ]);

  return (
    <div className="mx-auto max-w-[900px] px-6 pb-24 pt-12">
      <header className="mb-8">
        <h1 className="font-display text-[30px] font-medium text-ink">
          Your posts &amp; profile
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Member since {formatDate(profile.created_at)}
        </p>
      </header>

      <div className="flex flex-col gap-8">
        <Card>
          <h2 className="mb-5 font-display text-lg font-medium text-ink">
            Profile
          </h2>
          <ProfileForm profile={profile} />
        </Card>

        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-medium text-ink">
              Your articles
            </h2>
            <ButtonLink href="/write" size="sm">
              + New article
            </ButtonLink>
          </div>

          {articles.length > 0 ? (
            <Card className="p-0">
              <ul>
                {articles.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-2.5">
                        <Badge tone={a.status === "published" ? "primary" : "neutral"}>
                          {a.status === "published" ? "Published" : "Draft"}
                        </Badge>
                        <span className="text-[12.5px] text-ink-soft">
                          edited {timeAgo(a.updated_at)}
                        </span>
                      </div>
                      <p className="truncate font-display text-[17px] font-medium text-ink">
                        {a.status === "published" ? (
                          <Link
                            href={`/articles/${a.slug}`}
                            className="hover:text-primary-ink"
                          >
                            {a.title}
                          </Link>
                        ) : (
                          a.title
                        )}
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-ink-soft">
                        {pluralize(a.like_count, "like")} ·{" "}
                        {pluralize(a.comment_count, "comment")}
                      </p>
                    </div>

                    <Link
                      href={`/write/${a.id}`}
                      className="neu-sm neu-press shrink-0 rounded-full bg-surface px-4 py-2 text-[13px] font-semibold text-ink-label transition-all hover:text-ink"
                    >
                      Edit
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <EmptyState title="You haven't written an article yet">
              Your first week in a new country is someone else&apos;s hardest
              question.
            </EmptyState>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-medium text-ink">
              Your discussions
            </h2>
            <ButtonLink href="/discussions/new" size="sm" variant="secondary">
              + New thread
            </ButtonLink>
          </div>

          {threads.length > 0 ? (
            <Card className="p-0">
              <ul>
                {threads.map((t) => (
                  <li
                    key={t.id}
                    className="border-b border-border px-6 py-4 last:border-b-0"
                  >
                    <Link
                      href={`/discussions/${t.slug}`}
                      className="font-display text-[17px] font-medium text-ink hover:text-primary-ink"
                    >
                      {t.title}
                    </Link>
                    <p className="mt-0.5 text-[12.5px] text-ink-soft">
                      {pluralize(t.comment_count, "reply", "replies")} ·{" "}
                      {pluralize(t.like_count, "like")} · started{" "}
                      {timeAgo(t.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <EmptyState title="You haven't started a discussion yet">
              Ask the question you wish someone had answered for you.
            </EmptyState>
          )}
        </section>
      </div>
    </div>
  );
}
