import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Tag } from "@/components/ui/Chip";
import { ImagePlaceholder } from "@/components/ui/Card";
import { Prose } from "@/components/content/Prose";
import { LikeButton } from "@/components/content/LikeButton";
import { ReportButton } from "@/components/content/ReportButton";
import { CommentSection } from "@/components/content/CommentSection";
import { getArticleBySlug, getLikedIds } from "@/lib/queries";
import { getCurrentProfile } from "@/lib/auth";
import { countryLabel } from "@/lib/constants";
import { autoExcerpt, formatDate, pluralize, readingTime } from "@/lib/utils";

/* Rendered per-request rather than statically: the page has to know whether
 * *you* liked it and whether you may edit it, and the nav is auth-aware. The
 * SEO requirement is met regardless — the full article HTML is in the server
 * response, which is what crawlers read. Article slugs are still published in
 * sitemap.ts for discovery. */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) return { title: "Article not found" };

  const description = article.excerpt ?? autoExcerpt(article.body_md);

  return {
    title: article.title,
    description,
    openGraph: {
      type: "article",
      title: article.title,
      description,
      publishedTime: article.published_at ?? undefined,
      authors: article.author ? [article.author.display_name] : undefined,
      images: article.cover_url ? [{ url: article.cover_url }] : undefined,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) notFound();

  const profile = await getCurrentProfile();
  const liked = await getLikedIds(profile?.id ?? null, {
    articleIds: [article.id],
  });

  const path = `/articles/${article.slug}`;
  const isAuthor = profile?.id === article.author_id;

  return (
    <article className="mx-auto max-w-[760px] px-6 pb-24 pt-12">
      <Link
        href="/articles"
        className="text-sm text-ink-muted transition-colors hover:text-primary-ink"
      >
        ← Back to Articles
      </Link>

      <div className="mt-6">
        {article.status === "draft" ? (
          <div className="mb-5 rounded-[10px] border border-primary-edge bg-primary-tint px-4 py-3 text-sm text-primary-ink">
            This is a draft — only you can see it.{" "}
            <Link href={`/write/${article.id}`} className="font-semibold underline">
              Continue editing
            </Link>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2.5">
          <Badge>{article.category}</Badge>
          <span className="text-[13px] text-ink-muted">
            {countryLabel(article.country)}
          </span>
        </div>

        <h1 className="mb-5 mt-4 font-display text-[34px] font-medium leading-[1.2] text-ink sm:text-[42px]">
          {article.title}
        </h1>

        <div className="mb-7 flex items-center gap-3">
          <Avatar
            name={article.author?.display_name}
            src={article.author?.avatar_url}
            size="md"
          />
          <div>
            <p className="text-sm font-semibold text-ink">
              {article.author?.display_name ?? "Member"}
            </p>
            <p className="text-[13px] text-ink-muted">
              {readingTime(article.body_md)} ·{" "}
              {formatDate(article.published_at ?? article.created_at)}
            </p>
          </div>
        </div>

        {article.cover_url ? (
          <Image
            src={article.cover_url}
            alt=""
            width={760}
            height={340}
            priority
            className="mb-8 h-[240px] w-full rounded-[14px] object-cover sm:h-[340px]"
          />
        ) : (
          <ImagePlaceholder
            label={`photo — ${article.title}`}
            className="mb-8 h-[240px] sm:h-[340px]"
          />
        )}

        <Prose markdown={article.body_md} />

        {article.tags.length > 0 ? (
          <div className="mt-8 flex flex-wrap gap-2">
            {article.tags.map((tag, i) => (
              <Tag key={tag} index={i}>
                {tag}
              </Tag>
            ))}
          </div>
        ) : null}

        <div className="neu-inset mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[18px] px-6 py-4">
          <LikeButton
            kind="article"
            id={article.id}
            count={article.like_count}
            liked={liked.has(article.id)}
            signedIn={Boolean(profile)}
            returnTo={path}
          />

          <a href="#main-comments" className="text-sm text-ink-muted hover:text-primary-ink">
            💬 {pluralize(article.comment_count, "comment")}
          </a>

          {isAuthor ? (
            <Link
              href={`/write/${article.id}`}
              className="text-sm text-ink-muted transition-colors hover:text-primary-ink"
            >
              Edit
            </Link>
          ) : null}

          {profile && !isAuthor ? (
            <ReportButton kind="article" id={article.id} />
          ) : null}
        </div>

        <div id="main-comments">
          <CommentSection articleId={article.id} path={path} />
        </div>
      </div>
    </article>
  );
}
