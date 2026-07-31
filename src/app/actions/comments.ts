"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export interface CommentState {
  error?: string;
  ok?: boolean;
}

const createSchema = z
  .object({
    articleId: z.uuid().optional(),
    threadId: z.uuid().optional(),
    parentId: z.uuid().optional(),
    body: z
      .string()
      .trim()
      .min(1, "Write something first.")
      .max(8000, "That comment is too long (8000 characters max)."),
    path: z.string().startsWith("/"),
  })
  .refine((v) => Boolean(v.articleId) !== Boolean(v.threadId), {
    message: "A comment must belong to exactly one article or discussion.",
  });

function optionalId(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export async function createComment(
  _prev: CommentState,
  formData: FormData,
): Promise<CommentState> {
  const parsed = createSchema.safeParse({
    articleId: optionalId(formData.get("articleId")),
    threadId: optionalId(formData.get("threadId")),
    parentId: optionalId(formData.get("parentId")),
    body: formData.get("body"),
    path: formData.get("path"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid comment." };
  }

  const { articleId, threadId, parentId, body, path } = parsed.data;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Log in to join the conversation." };

  const { error } = await supabase.from("comments").insert({
    author_id: user.id,
    article_id: articleId ?? null,
    thread_id: threadId ?? null,
    parent_comment_id: parentId ?? null,
    body_md: body,
  });

  if (error) {
    return { error: "Your comment could not be posted. Please try again." };
  }

  revalidatePath(path);
  return { ok: true };
}

const editSchema = z.object({
  id: z.uuid(),
  body: z.string().trim().min(1, "Write something first.").max(8000),
  path: z.string().startsWith("/"),
});

export async function updateComment(
  _prev: CommentState,
  formData: FormData,
): Promise<CommentState> {
  const parsed = editSchema.safeParse({
    id: formData.get("id"),
    body: formData.get("body"),
    path: formData.get("path"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid comment." };
  }

  const supabase = await createClient();

  // No ownership check here on purpose — the RLS UPDATE policy is the real
  // guard, and duplicating it in application code invites the two to drift.
  const { error } = await supabase
    .from("comments")
    .update({ body_md: parsed.data.body })
    .eq("id", parsed.data.id);

  if (error) return { error: "You can only edit your own comments." };

  revalidatePath(parsed.data.path);
  return { ok: true };
}

/**
 * Soft delete. The row stays so that reply chains keep their shape; the UI
 * renders it as "[removed]". The trigger on `deleted_at` decrements the
 * parent's comment_count.
 */
export async function deleteComment(formData: FormData) {
  const id = formData.get("id");
  const path = formData.get("path");
  if (typeof id !== "string" || typeof path !== "string") return;

  const supabase = await createClient();
  await supabase
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath(path.startsWith("/") ? path : "/");
}
