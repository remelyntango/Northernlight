import Link from "next/link";
import { CommentItem } from "@/components/content/CommentItem";
import { CommentForm } from "@/components/content/CommentForm";
import {
  collectCommentIds,
  countComments,
  getComments,
  getLikedIds,
} from "@/lib/queries";
import { getCurrentProfile } from "@/lib/auth";
import { pluralize } from "@/lib/utils";

/**
 * Server component. Loads the comment tree and, in a single extra query, which
 * of those comments the current user has liked — so a 50-comment page still
 * costs two round-trips rather than 50.
 */
export async function CommentSection({
  articleId,
  threadId,
  path,
}: {
  articleId?: string;
  threadId?: string;
  path: string;
}) {
  const [profile, comments] = await Promise.all([
    getCurrentProfile(),
    getComments(articleId ? { articleId } : { threadId: threadId! }),
  ]);

  const commentIds = collectCommentIds(comments);
  const likedIds = await getLikedIds(profile?.id ?? null, { commentIds });
  const total = countComments(comments);

  return (
    <section className="mt-10" aria-label="Comments">
      <h2 className="mb-5 font-display text-[19px] font-medium text-ink">
        {total === 0 ? "No comments yet" : pluralize(total, "comment")}
      </h2>

      {comments.length > 0 ? (
        <div className="flex flex-col gap-5">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              path={path}
              articleId={articleId}
              threadId={threadId}
              currentUserId={profile?.id ?? null}
              isAdmin={profile?.role === "admin"}
              likedIds={[...likedIds]}
              authorName={profile?.display_name ?? ""}
              avatarUrl={profile?.avatar_url}
            />
          ))}
        </div>
      ) : null}

      {profile ? (
        <CommentForm
          articleId={articleId}
          threadId={threadId}
          path={path}
          authorName={profile.display_name}
          avatarUrl={profile.avatar_url}
        />
      ) : (
        <p className="mt-5 text-sm text-ink-muted">
          <Link
            href={`/login?next=${encodeURIComponent(path)}`}
            className="font-semibold text-primary-link underline underline-offset-2 hover:text-primary-hover"
          >
            Log in
          </Link>{" "}
          to join the conversation.
        </p>
      )}
    </section>
  );
}
