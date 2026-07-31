"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, COUNTRY_VALUES } from "@/lib/constants";
import { slugify } from "@/lib/utils";

export interface ThreadState {
  error?: string;
  fields?: Partial<Record<"title" | "body" | "category" | "country", string>>;
  values?: { title?: string; body?: string; category?: string; country?: string };
}

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(8, "Give your question a clearer title (8 characters minimum).")
    .max(160, "Titles are limited to 160 characters."),
  body: z
    .string()
    .trim()
    .min(20, "Add a little more context — 20 characters minimum.")
    .max(20000, "That post is too long (20,000 characters max)."),
  category: z.enum(CATEGORIES),
  country: z.enum(COUNTRY_VALUES as [string, ...string[]]),
});

/**
 * Reserves a unique slug.
 *
 * The DB has a unique index on `slug`, so this is a best-effort pre-check; the
 * insert below still handles a 23505 in case two authors race.
 */
async function uniqueSlug(base: string, table: "articles" | "threads") {
  const supabase = await createClient();
  const slug = slugify(base);

  const { data } = await supabase
    .from(table)
    .select("slug")
    .like("slug", `${slug}%`);

  const taken = new Set((data ?? []).map((r) => r.slug as string));
  if (!taken.has(slug)) return slug;

  for (let i = 2; i < 50; i++) {
    const candidate = `${slug}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${slug}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function createThread(
  _prev: ThreadState,
  formData: FormData,
): Promise<ThreadState> {
  const values = {
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    category: String(formData.get("category") ?? ""),
    country: String(formData.get("country") ?? "all"),
  };

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error).fieldErrors as Record<
      string,
      string[]
    >;
    return {
      values,
      fields: {
        title: flat.title?.[0],
        body: flat.body?.[0],
        category: flat.category?.[0],
        country: flat.country?.[0],
      },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { values, error: "Log in to start a discussion." };

  const slug = await uniqueSlug(parsed.data.title, "threads");

  const { data, error } = await supabase
    .from("threads")
    .insert({
      author_id: user.id,
      title: parsed.data.title,
      slug,
      body_md: parsed.data.body,
      category: parsed.data.category,
      country: parsed.data.country,
    })
    .select("slug")
    .single();

  if (error || !data) {
    return { values, error: "Your discussion could not be posted. Try again." };
  }

  revalidatePath("/discussions");
  revalidatePath("/");
  redirect(`/discussions/${data.slug}`);
}

export async function deleteThread(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  // RLS restricts this to the author or an admin.
  await supabase.from("threads").delete().eq("id", id);

  revalidatePath("/discussions");
  revalidatePath("/");
  redirect("/discussions");
}
