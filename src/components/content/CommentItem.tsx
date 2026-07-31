"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Avatar } from "@/components/ui/Avatar";
import { CommentProse } from "@/components/content/Prose";
import { CommentForm } from "@/components/content/CommentForm";
import { LikeButton } from "@/components/content/LikeButton";
import { ReportButton } from "@/components/content/ReportButton";
import { FieldError } from "@/components/ui/Field";
import {
  deleteComment,
  updateComment,
  type CommentState,
} from "@/app/actions/comments";
import { cx, timeAgo } from "@/lib/utils";
import type { CommentNode } from "@/lib/types";

const ACTION_LINK =
  "cursor-pointer text-[12.5px] text-ink-muted transition-colors hover:text-primary-ink";

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cx(ACTION_LINK, "hover:text-danger disabled:opacity-55")}
      onClick={(e) => {
        if (!confirm("Delete this comment? Replies to it will stay visible.")) {
          e.preventDefault();
        }
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

function EditForm({
  comment,
  path,
  onClose,
}: {
  comment: CommentNode;
  path: string;
  onClose: () => void;
}) {
  const [state, action] = useActionState<CommentState, FormData>(
    updateComment,
    {},
  );

  // Close on success — in an effect, not during render, so we don't update a
  // parent's state mid-render.
  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <form action={action} className="mt-1">
      <input type="hidden" name="id" value={comment.id} />
      <input type="hidden" name="path" value={path} />
      <textarea
        name="body"
        defaultValue={comment.body_md}
        rows={3}
        required
        maxLength={8000}
        className="w-full resize-y rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-sm leading-relaxed text-ink focus:border-primary"
      />
      <FieldError>{state.error}</FieldError>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          className="cursor-pointer rounded-[10px] bg-primary px-4 py-2 text-[13px] font-semibold text-on-primary hover:bg-primary-hover"
        >
          Save
        </button>
        <button type="button" onClick={onClose} className={ACTION_LINK}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function CommentItem({
  comment,
  path,
  articleId,
  threadId,
  currentUserId,
  isAdmin,
  likedIds,
  authorName,
  avatarUrl,
}: {
  comment: CommentNode;
  path: string;
  articleId?: string;
  threadId?: string;
  currentUserId: string | null;
  isAdmin: boolean;
  likedIds: string[];
  authorName: string;
  avatarUrl?: string | null;
}) {
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);

  // Stable identities so the success effects in the child forms don't re-fire
  // on every parent render.
  const closeEdit = useCallback(() => setEditing(false), []);
  const closeReply = useCallback(() => setReplying(false), []);

  const removed = Boolean(comment.deleted_at);
  const mine = currentUserId === comment.author_id;
  const canModify = !removed && (mine || isAdmin);

  return (
    <div id={`comment-${comment.id}`} className="scroll-mt-24">
      <div className="flex gap-3">
        <Avatar
          name={removed ? null : comment.author?.display_name}
          src={removed ? null : comment.author?.avatar_url}
          size="sm"
        />

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-ink">
              {removed ? "Removed" : comment.author?.display_name ?? "Member"}
            </span>
            <span className="text-[12.5px] text-ink-soft">
              {timeAgo(comment.created_at)}
            </span>
            {comment.updated_at !== comment.created_at && !removed ? (
              <span className="text-[12.5px] text-ink-soft">· edited</span>
            ) : null}
            {comment.replyingTo ? (
              <span className="text-[12.5px] text-ink-soft">
                · replying to {comment.replyingTo}
              </span>
            ) : null}
          </div>

          {removed ? (
            <p className="text-[14.5px] italic text-ink-soft">
              [This comment was removed.]
            </p>
          ) : editing ? (
            <EditForm comment={comment} path={path} onClose={closeEdit} />
          ) : (
            <CommentProse markdown={comment.body_md} />
          )}

          {!removed ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-4">
              <LikeButton
                kind="comment"
                id={comment.id}
                count={comment.like_count}
                liked={likedIds.includes(comment.id)}
                signedIn={Boolean(currentUserId)}
                size="sm"
                returnTo={path}
              />

              {currentUserId ? (
                <button
                  type="button"
                  onClick={() => setReplying((v) => !v)}
                  className={ACTION_LINK}
                >
                  {replying ? "Cancel" : "Reply"}
                </button>
              ) : null}

              {canModify ? (
                <>
                  {mine ? (
                    <button
                      type="button"
                      onClick={() => setEditing((v) => !v)}
                      className={ACTION_LINK}
                    >
                      {editing ? "Cancel" : "Edit"}
                    </button>
                  ) : null}
                  <form action={deleteComment} className="inline">
                    <input type="hidden" name="id" value={comment.id} />
                    <input type="hidden" name="path" value={path} />
                    <DeleteButton />
                  </form>
                </>
              ) : null}

              {currentUserId && !mine ? (
                <ReportButton kind="comment" id={comment.id} />
              ) : null}
            </div>
          ) : null}

          {replying && currentUserId ? (
            <CommentForm
              articleId={articleId}
              threadId={threadId}
              parentId={comment.id}
              path={path}
              authorName={authorName}
              avatarUrl={avatarUrl}
              placeholder={`Reply to ${comment.author?.display_name ?? "this comment"}…`}
              submitLabel="Reply"
              autoFocus
              compact
              onDone={closeReply}
            />
          ) : null}
        </div>
      </div>

      {comment.replies.length > 0 ? (
        <div className="mt-5 flex flex-col gap-5 border-l border-border pl-4 sm:ml-[18px] sm:pl-6">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              path={path}
              articleId={articleId}
              threadId={threadId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              likedIds={likedIds}
              authorName={authorName}
              avatarUrl={avatarUrl}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
