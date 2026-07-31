"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export interface ProfileState {
  error?: string;
  ok?: boolean;
}

const schema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Names need at least 2 characters.")
    .max(60, "That name is a bit long."),
  bio: z.string().trim().max(400, "Keep the bio under 400 characters.").optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const parsed = schema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio"),
    avatarUrl: formData.get("avatarUrl"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Log in to update your profile." };

  // Note: `role` is deliberately not in this payload. Even if it were, the
  // guard_role_change trigger would reject a self-promotion.
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      bio: parsed.data.bio || null,
      avatar_url: parsed.data.avatarUrl || null,
    })
    .eq("id", user.id);

  if (error) return { error: "Could not save your profile." };

  revalidatePath("/", "layout");
  return { ok: true };
}
