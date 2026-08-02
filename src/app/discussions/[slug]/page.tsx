import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Prose } from "@/components/content/Prose";
import { LikeButton } from "@/components/content/LikeButton";
import { ReportButton } from "@/components/content/ReportButton";
import { CommentSection } from "@/components/content/CommentSection";
import { DeleteThreadButton } from "@/components/content/DeleteThreadButton";
import { getLikedIds, getThreadBySlug } from "@/lib/queries";
import { getCurrentProfile } from "@/lib/auth";
import { countryLabel } from "@/lib/constants";
import { autoExcerpt, formatDate, pluralize } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const thread = await getThreadBySlug(slug);

  if (!thread) return { title: "Discussion not found" };

  const description = autoExcerpt(thread.body_md);

  return {
    title: thread.title,
    description,
    openGraph: {
      type: "article",
      title: thread.title,
      description,
      publishedTime: thread.created_at,
      authors: thread.author ? [thread.author.display_name] : undefined,
    },
  };
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const thread = await getThreadBySlug(slug);

  if (!thread) notFound();

  const profile = await getCurrentProfile();
  const liked = await getLikedIds(profile?.id ?? null, {
    threadIds: [thread.id],
  });

  const path = `/discussions/${thread.slug}`;
  const isAuthor = profile?.id === thread.author_id;
  const canDelete = isAuthor || profile?.role === "admin";

  return (
    <div className="mx-auto max-w-[760px] px-6 pb-24 pt-12">
      <Link
        href="/discussions"
        className="text-sm text-ink-muted transition-colors hover:text-primary-ink"
      >
        ← Back to Discussions
      </Link>

      <article className="mt-6">
        {/* Green accent here, terracotta on articles — the same visual split
            the mockup uses to tell the two content types apart. */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-[10px] bg-accent-tint px-2.5 py-[3px] text-xs font-semibold text-accent-ink">
            {thread.category}
          </span>
          <span className="text-[13px] text-ink-muted">
            {countryLabel(thread.country)}
          </span>
        </div>

        <h1 className="mb-5 mt-4 font-display text-[30px] font-medium leading-[1.25] text-ink sm:text-[36px]">
          {thread.title}
        </h1>

        <div className="mb-7 flex items-center gap-3">
          <Avatar
            name={thread.author?.display_name}
            src={thread.author?.avatar_url}
            size="md"
          />
          <div>
            <p className="text-sm font-semibold text-ink">
              {thread.author?.display_name ?? "Member"}
            </p>
            <p className="text-[13px] text-ink-muted">
              Started {formatDate(thread.created_at)}
            </p>
          </div>
        </div>

        <Prose markdown={thread.body_md} />

        <div className="neu-inset mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[18px] px-6 py-4">
          <LikeButton
            kind="thread"
            id={thread.id}
            count={thread.like_count}
            liked={liked.has(thread.id)}
            signedIn={Boolean(profile)}
            returnTo={path}
          />

          <span className="text-sm text-ink-muted">
            💬 {pluralize(thread.comment_count, "reply", "replies")}
          </span>

          {canDelete ? <DeleteThreadButton id={thread.id} /> : null}

          {profile && !isAuthor ? (
            <ReportButton kind="thread" id={thread.id} />
          ) : null}
        </div>
      </article>

      <CommentSection threadId={thread.id} path={path} />
    </div>
  );
}
