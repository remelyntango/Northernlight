"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createComment, type CommentState } from "@/app/actions/comments";
import { Avatar } from "@/components/ui/Avatar";
import { FieldError } from "@/components/ui/Field";
import { cx } from "@/lib/utils";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="grad-primary neu-xs neu-press shrink-0 cursor-pointer self-start rounded-[14px] px-[18px] py-3 text-sm font-semibold text-on-primary transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none"
    >
      {pending ? "Posting…" : label}
    </button>
  );
}

export function CommentForm({
  articleId,
  threadId,
  parentId,
  path,
  authorName,
  avatarUrl,
  placeholder = "Add a comment…",
  submitLabel = "Post",
  autoFocus = false,
  compact = false,
  onDone,
}: {
  articleId?: string;
  threadId?: string;
  parentId?: string;
  path: string;
  authorName: string;
  avatarUrl?: string | null;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  compact?: boolean;
  onDone?: () => void;
}) {
  const [state, action] = useActionState<CommentState, FormData>(
    createComment,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onDone?.();
    }
  }, [state.ok, onDone]);

  return (
    <form
      ref={formRef}
      action={action}
      className={cx("flex gap-3", compact ? "mt-3" : "mt-6")}
    >
      {articleId ? <input type="hidden" name="articleId" value={articleId} /> : null}
      {threadId ? <input type="hidden" name="threadId" value={threadId} /> : null}
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
      <input type="hidden" name="path" value={path} />

      {!compact ? (
        <Avatar name={authorName} src={avatarUrl} size="sm" />
      ) : null}

      <div className="flex-1">
        <div className="flex gap-2.5">
          <textarea
            name="body"
            rows={compact ? 2 : 2}
            required
            maxLength={8000}
            autoFocus={autoFocus}
            placeholder={placeholder}
            className="neu-inset min-h-[48px] flex-1 resize-y rounded-[14px] bg-surface px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-soft"
          />
          <Submit label={submitLabel} />
        </div>
        <FieldError>{state.error}</FieldError>
        <p className="mt-1.5 text-[12px] text-ink-soft">
          Markdown supported.
        </p>
      </div>
    </form>
  );
}
