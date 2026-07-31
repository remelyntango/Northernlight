"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  kind: z.enum(["article", "thread", "comment"]),
  id: z.uuid(),
  /** True when the user currently likes it, i.e. this call should unlike. */
  liked: z.boolean(),
});

export interface LikeResult {
  ok: boolean;
  liked: boolean;
  error?: string;
}

const COLUMN = {
  article: "article_id",
  thread: "thread_id",
  comment: "comment_id",
} as const;

/**
 * Toggles a like for the signed-in user.
 *
 * Deliberately does NOT revalidate the page: the button updates optimistically
 * and the count is corrected from this return value. Revalidating would blow
 * away the whole comment section on every heart click.
 *
 * Correctness lives in the database — the partial unique indexes on `likes`
 * make a double insert impossible even if two clicks race.
 */
export async function toggleLike(input: {
  kind: "article" | "thread" | "comment";
  id: string;
  liked: boolean;
}): Promise<LikeResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, liked: input.liked, error: "Invalid request." };
  }

  const { kind, id, liked } = parsed.data;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, liked, error: "Log in to like this." };
  }

  const column = COLUMN[kind];

  if (liked) {
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("user_id", user.id)
      .eq(column, id);

    if (error) return { ok: false, liked, error: "Could not remove that like." };
    return { ok: true, liked: false };
  }

  const { error } = await supabase
    .from("likes")
    .insert({ user_id: user.id, [column]: id });

  if (error) {
    // 23505 = unique violation: already liked, so the desired state is reached.
    if (error.code === "23505") return { ok: true, liked: true };
    return { ok: false, liked, error: "Could not save that like." };
  }

  return { ok: true, liked: true };
}
