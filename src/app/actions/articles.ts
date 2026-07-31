"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, COUNTRY_VALUES } from "@/lib/constants";
import { autoExcerpt, parseTags, slugify } from "@/lib/utils";

export interface ArticleState {
  error?: string;
  fields?: Partial<
    Record<"title" | "body" | "category" | "country" | "excerpt", string>
  >;
}

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(8, "Give the article a title (8 characters minimum).")
    .max(160, "Titles are limited to 160 characters."),
  body: z
    .string()
    .trim()
    .min(1, "An article needs a body.")
    .max(60000, "That article is too long (60,000 characters max)."),
  excerpt: z
    .string()
    .trim()
    .max(320, "Keep the summary under 320 characters.")
    .optional(),
  category: z.enum(CATEGORIES),
  country: z.enum(COUNTRY_VALUES as [string, ...string[]]),
  coverUrl: z.string().url().optional().or(z.literal("")),
  tags: z.string().max(200).optional(),
});

/** Drafts are held to a laxer standard so an author can save early and often. */
const draftSchema = schema.extend({
  title: z.string().trim().min(1, "Give the draft a working title.").max(160),
  body: z.string().max(60000).optional(),
});

async function uniqueSlug(base: string, excludeId?: string) {
  const supabase = await createClient();
  const slug = slugify(base);

  const { data } = await supabase
    .from("articles")
    .select("id, slug")
    .like("slug", `${slug}%`);

  const taken = new Set(
    (data ?? [])
      .filter((r) => r.id !== excludeId)
      .map((r) => r.slug as string),
  );

  if (!taken.has(slug)) return slug;
  for (let i = 2; i < 50; i++) {
    if (!taken.has(`${slug}-${i}`)) return `${slug}-${i}`;
  }
  return `${slug}-${Math.random().toString(36).slice(2, 7)}`;
}

function readForm(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    excerpt: String(formData.get("excerpt") ?? ""),
    category: String(formData.get("category") ?? ""),
    country: String(formData.get("country") ?? "all"),
    coverUrl: String(formData.get("coverUrl") ?? ""),
    tags: String(formData.get("tags") ?? ""),
  };
}

function toFieldErrors(error: z.ZodError): ArticleState {
  const flat = z.flattenError(error).fieldErrors as Record<string, string[]>;
  return {
    fields: {
      title: flat.title?.[0],
      body: flat.body?.[0],
      excerpt: flat.excerpt?.[0],
      category: flat.category?.[0],
      country: flat.country?.[0],
    },
  };
}

/**
 * Creates or updates an article.
 *
 * `intent` is "draft" or "publish" — the same form serves both, so the author
 * never loses work by picking the wrong button first.
 */
export async function saveArticle(
  _prev: ArticleState,
  formData: FormData,
): Promise<ArticleState> {
  const id = String(formData.get("id") ?? "");
  const intent = formData.get("intent") === "publish" ? "publish" : "draft";
  const raw = readForm(formData);

  const parsed = (intent === "publish" ? schema : draftSchema).safeParse(raw);
  if (!parsed.success) return toFieldErrors(parsed.error);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Log in to publish." };

  const body = parsed.data.body ?? "";

  const payload = {
    title: parsed.data.title,
    body_md: body,
    excerpt: raw.excerpt.trim() || autoExcerpt(body) || null,
    category: parsed.data.category,
    country: parsed.data.country,
    cover_url: raw.coverUrl.trim() || null,
    tags: parseTags(raw.tags),
    status: intent === "publish" ? "published" : "draft",
  };

  if (id) {
    const { data, error } = await supabase
      .from("articles")
      .update(payload)
      .eq("id", id)
      .select("slug, status")
      .single();

    if (error || !data) {
      return { error: "Could not save. You can only edit your own articles." };
    }

    revalidatePath(`/articles/${data.slug}`);
    revalidatePath("/articles");
    revalidatePath("/");

    if (data.status === "published") redirect(`/articles/${data.slug}`);
    redirect(`/write/${id}`);
  }

  const slug = await uniqueSlug(parsed.data.title);

  const { data, error } = await supabase
    .from("articles")
    .insert({ ...payload, slug, author_id: user.id })
    .select("id, slug, status")
    .single();

  if (error || !data) {
    return { error: "Could not save that article. Please try again." };
  }

  revalidatePath("/articles");
  revalidatePath("/");

  if (data.status === "published") redirect(`/articles/${data.slug}`);
  redirect(`/write/${data.id}`);
}

export async function deleteArticle(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase.from("articles").delete().eq("id", id);

  revalidatePath("/articles");
  revalidatePath("/");
  redirect("/settings");
}

/** Take a published article back to draft. */
export async function unpublishArticle(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase.from("articles").update({ status: "draft" }).eq("id", id);

  revalidatePath("/articles");
  revalidatePath("/");
  revalidatePath("/settings");
}
