"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveArticle, type ArticleState } from "@/app/actions/articles";
import { deleteArticle, unpublishArticle } from "@/app/actions/articles";
import { ImageUpload } from "@/components/editor/ImageUpload";
import { Prose } from "@/components/content/Prose";
import {
  FieldError,
  FormError,
  Input,
  Label,
  Select,
} from "@/components/ui/Field";
import { CATEGORIES, COUNTRIES } from "@/lib/constants";
import { cx } from "@/lib/utils";
import type { ArticleWithAuthor } from "@/lib/types";

function SaveButton({
  intent,
  children,
  variant,
}: {
  intent: "draft" | "publish";
  children: string;
  variant: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={pending}
      className={cx(
        "cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55",
        variant === "primary"
          ? "bg-primary text-on-primary hover:bg-primary-hover"
          : "border border-border bg-subtle text-ink-label hover:bg-surface",
      )}
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

const TAB = "cursor-pointer px-4 py-2 text-sm font-semibold transition-colors";

export function ArticleEditor({ article }: { article?: ArticleWithAuthor }) {
  const [state, action] = useActionState<ArticleState, FormData>(
    saveArticle,
    {},
  );

  const [tab, setTab] = useState<"write" | "preview">("write");
  const [body, setBody] = useState(article?.body_md ?? "");

  const isEdit = Boolean(article);

  return (
    <div className="mx-auto max-w-[920px] px-6 pb-24 pt-12">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[30px] font-medium text-ink">
            {isEdit ? "Edit article" : "Write an article"}
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            {isEdit && article?.status === "published" ? (
              <>
                Published ·{" "}
                <Link
                  href={`/articles/${article.slug}`}
                  className="text-primary-link underline"
                >
                  View it live
                </Link>
              </>
            ) : (
              "Saved as a draft until you publish. Only you can see drafts."
            )}
          </p>
        </div>

        {isEdit ? (
          <div className="flex items-center gap-3">
            {article?.status === "published" ? (
              <form action={unpublishArticle}>
                <input type="hidden" name="id" value={article.id} />
                <button
                  type="submit"
                  className="cursor-pointer text-[13px] text-ink-muted underline hover:text-ink"
                >
                  Unpublish
                </button>
              </form>
            ) : null}
            <form action={deleteArticle}>
              <input type="hidden" name="id" value={article!.id} />
              <button
                type="submit"
                onClick={(e) => {
                  if (!confirm("Delete this article permanently?")) {
                    e.preventDefault();
                  }
                }}
                className="cursor-pointer text-[13px] text-danger underline"
              >
                Delete
              </button>
            </form>
          </div>
        ) : null}
      </div>

      <form action={action} className="flex flex-col gap-5">
        {article ? <input type="hidden" name="id" value={article.id} /> : null}

        {state.error ? <FormError>{state.error}</FormError> : null}

        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            defaultValue={article?.title ?? ""}
            required
            maxLength={160}
            placeholder="Cracking the Danish CPR Number"
            className="font-serif text-xl"
          />
          <FieldError>{state.fields?.title}</FieldError>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="category">Topic</Label>
            <Select
              id="category"
              name="category"
              defaultValue={article?.category ?? CATEGORIES[0]}
              required
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <FieldError>{state.fields?.category}</FieldError>
          </div>

          <div>
            <Label htmlFor="country">Country</Label>
            <Select
              id="country"
              name="country"
              defaultValue={article?.country ?? "all"}
            >
              {COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
            <FieldError>{state.fields?.country}</FieldError>
          </div>
        </div>

        <div>
          <Label htmlFor="excerpt" hint="Optional — generated from the body if left blank">
            Summary
          </Label>
          <Input
            id="excerpt"
            name="excerpt"
            defaultValue={article?.excerpt ?? ""}
            maxLength={320}
            placeholder="One or two sentences shown in the feed."
          />
          <FieldError>{state.fields?.excerpt}</FieldError>
        </div>

        <div>
          <Label htmlFor="tags" hint="Comma separated, up to 5">
            Tags
          </Label>
          <Input
            id="tags"
            name="tags"
            defaultValue={article?.tags.join(", ") ?? ""}
            placeholder="Denmark, CPR, Paperwork"
          />
        </div>

        <div>
          <Label>Cover image</Label>
          <ImageUpload
            bucket="covers"
            name="coverUrl"
            initialUrl={article?.cover_url}
          />
        </div>

        {/* Body: write / preview share one <Prose> renderer, so the preview is
            byte-for-byte what readers will get. */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label htmlFor="body">Body</Label>
            <div
              role="tablist"
              className="flex rounded-full border border-border bg-subtle p-0.5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === "write"}
                onClick={() => setTab("write")}
                className={cx(
                  TAB,
                  "rounded-full",
                  tab === "write"
                    ? "bg-surface text-ink shadow-sm"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                Write
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "preview"}
                onClick={() => setTab("preview")}
                className={cx(
                  TAB,
                  "rounded-full",
                  tab === "preview"
                    ? "bg-surface text-ink shadow-sm"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                Preview
              </button>
            </div>
          </div>

          {/* Kept mounted (just hidden) so the textarea's value is always part
              of the form submission, whichever tab is showing. */}
          <textarea
            id="body"
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={22}
            maxLength={60000}
            placeholder={"Write in Markdown.\n\n## A heading\n\n> A pull quote\n\n- A list item"}
            className={cx(
              "w-full resize-y rounded-[10px] border border-border bg-surface px-4 py-3.5 font-mono text-[14px] leading-[1.7] text-ink focus:border-primary",
              tab === "preview" && "hidden",
            )}
          />

          {tab === "preview" ? (
            <div className="min-h-[420px] rounded-[10px] border border-border bg-surface px-6 py-5">
              {body.trim() ? (
                <Prose markdown={body} />
              ) : (
                <p className="text-sm text-ink-soft">
                  Nothing to preview yet.
                </p>
              )}
            </div>
          ) : null}

          <FieldError>{state.fields?.body}</FieldError>
          <p className="mt-1.5 text-[12px] text-ink-soft">
            Markdown supported: **bold**, ## headings, &gt; quotes, - lists,
            [links](https://example.com).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <SaveButton intent="publish" variant="primary">
            {article?.status === "published" ? "Save changes" : "Publish"}
          </SaveButton>
          <SaveButton intent="draft" variant="secondary">
            Save draft
          </SaveButton>
          <Link
            href="/settings"
            className="text-[13px] text-ink-muted underline hover:text-ink"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
