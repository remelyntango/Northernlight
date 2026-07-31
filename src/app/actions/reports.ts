"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { REPORT_REASONS } from "@/lib/constants";

const schema = z.object({
  kind: z.enum(["article", "thread", "comment"]),
  id: z.uuid(),
  reason: z.enum(REPORT_REASONS),
  note: z.string().trim().max(1000).optional(),
});

const COLUMN = {
  article: "article_id",
  thread: "thread_id",
  comment: "comment_id",
} as const;

export async function submitReport(input: {
  kind: "article" | "thread" | "comment";
  id: string;
  reason: string;
  note?: string;
}): Promise<{ ok: boolean; message: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Pick a reason first." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Log in to report content." };

  const { kind, id, reason, note } = parsed.data;

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    [COLUMN[kind]]: id,
    reason,
    note: note || null,
  });

  if (error) {
    // A partial unique index allows one open report per user per target.
    if (error.code === "23505") {
      return { ok: true, message: "You've already reported this — thank you." };
    }
    return { ok: false, message: "Could not submit that report." };
  }

  return { ok: true, message: "Thanks — a moderator will take a look." };
}
