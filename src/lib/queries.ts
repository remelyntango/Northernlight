import { createClient } from "@/lib/supabase/server";
import { MAX_COMMENT_DEPTH, PAGE_SIZE } from "@/lib/constants";
import { autoExcerpt } from "@/lib/utils";
import type {
  ArticleWithAuthor,
  AuthorRef,
  CommentNode,
  CommentWithAuthor,
  FeedItem,
  SearchResult,
  ThreadWithAuthor,
} from "@/lib/types";

/** Every content query pulls the author byline through this join. */
const AUTHOR = "author:profiles!inner(id, display_name, avatar_url)";

interface Filters {
  country?: string;
  category?: string;
  page?: number;
}

/* -------------------------------------------------------------------------- */
/* Feed                                                                        */
/* -------------------------------------------------------------------------- */

/** Home feed: articles and threads interleaved by recency, via the
 *  `feed_items` view. Authors are resolved in one follow-up query rather than
 *  a join, because PostgREST can't join through a view without a FK. */
export async function getFeed({
  country,
  limit = 8,
}: { country?: string; limit?: number } = {}): Promise<FeedItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("feed_items")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (country && country !== "all") {
    // "all"-tagged content is relevant to every country filter.
    query = query.in("country", [country, "all"]);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const authors = await getAuthors(data.map((row) => row.author_id as string));

  return data.map((row) => ({
    kind: row.kind as "article" | "thread",
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    excerpt: autoExcerpt((row.excerpt as string) ?? ""),
    category: row.category as string,
    country: row.country as string,
    author: authors.get(row.author_id as string) ?? null,
    like_count: row.like_count as number,
    comment_count: row.comment_count as number,
    published_at: row.published_at as string,
    cover_url: (row.cover_url as string | null) ?? null,
    reading_time: row.read_minutes
      ? `${row.read_minutes} min read`
      : null,
  }));
}

async function getAuthors(ids: string[]): Promise<Map<string, AuthorRef>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", unique);

  return new Map((data ?? []).map((p) => [p.id, p as AuthorRef]));
}

/* -------------------------------------------------------------------------- */
/* Articles                                                                    */
/* -------------------------------------------------------------------------- */

export async function getArticles({
  country,
  category,
  page = 1,
}: Filters = {}): Promise<{ items: ArticleWithAuthor[]; total: number }> {
  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("articles")
    .select(`*, ${AUTHOR}`, { count: "exact" })
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (country && country !== "all") query = query.in("country", [country, "all"]);
  if (category) query = query.eq("category", category);

  const { data, count, error } = await query;
  if (error) return { items: [], total: 0 };

  return {
    items: (data ?? []) as unknown as ArticleWithAuthor[],
    total: count ?? 0,
  };
}

export async function getArticleBySlug(
  slug: string,
): Promise<ArticleWithAuthor | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select(`*, ${AUTHOR}`)
    .eq("slug", slug)
    .maybeSingle();

  return (data as unknown as ArticleWithAuthor) ?? null;
}

export async function getArticleById(
  id: string,
): Promise<ArticleWithAuthor | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select(`*, ${AUTHOR}`)
    .eq("id", id)
    .maybeSingle();

  return (data as unknown as ArticleWithAuthor) ?? null;
}

/** Slugs for generateStaticParams. */
export async function getPublishedArticleSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("slug")
    .eq("status", "published")
    .limit(200);
  return (data ?? []).map((r) => r.slug as string);
}

/* -------------------------------------------------------------------------- */
/* Threads                                                                     */
/* -------------------------------------------------------------------------- */

export async function getThreads({
  country,
  category,
  page = 1,
}: Filters = {}): Promise<{ items: ThreadWithAuthor[]; total: number }> {
  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("threads")
    .select(`*, ${AUTHOR}`, { count: "exact" })
    .order("last_activity_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (country && country !== "all") query = query.in("country", [country, "all"]);
  if (category) query = query.eq("category", category);

  const { data, count, error } = await query;
  if (error) return { items: [], total: 0 };

  return {
    items: (data ?? []) as unknown as ThreadWithAuthor[],
    total: count ?? 0,
  };
}

export async function getThreadBySlug(
  slug: string,
): Promise<ThreadWithAuthor | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("threads")
    .select(`*, ${AUTHOR}`)
    .eq("slug", slug)
    .maybeSingle();

  return (data as unknown as ThreadWithAuthor) ?? null;
}

/** Sidebar "Trending discussions" — most-replied threads that saw activity
 *  in the last week, falling back to most-replied overall. */
export async function getTrendingThreads(limit = 3): Promise<ThreadWithAuthor[]> {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();

  const { data } = await supabase
    .from("threads")
    .select(`*, ${AUTHOR}`)
    .gte("last_activity_at", weekAgo)
    .order("comment_count", { ascending: false })
    .limit(limit);

  if (data && data.length > 0) {
    return data as unknown as ThreadWithAuthor[];
  }

  const { data: fallback } = await supabase
    .from("threads")
    .select(`*, ${AUTHOR}`)
    .order("comment_count", { ascending: false })
    .limit(limit);

  return (fallback ?? []) as unknown as ThreadWithAuthor[];
}

export async function getThreadSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("threads").select("slug").limit(200);
  return (data ?? []).map((r) => r.slug as string);
}

/* -------------------------------------------------------------------------- */
/* Comments                                                                    */
/* -------------------------------------------------------------------------- */

/** All comments for one article or thread, as a nested tree. One flat query;
 *  the nesting is assembled in memory. */
export async function getComments(
  target: { articleId: string } | { threadId: string },
): Promise<CommentNode[]> {
  const supabase = await createClient();

  const column = "articleId" in target ? "article_id" : "thread_id";
  const value = "articleId" in target ? target.articleId : target.threadId;

  const { data } = await supabase
    .from("comments")
    .select(`*, ${AUTHOR}`)
    .eq(column, value)
    .order("created_at", { ascending: true });

  return buildCommentTree((data ?? []) as unknown as CommentWithAuthor[]);
}

/**
 * Turns a flat, chronologically ordered comment list into a tree.
 *
 * Replies deeper than MAX_COMMENT_DEPTH are attached at the maximum depth
 * instead, carrying a `replyingTo` name so the context survives the flattening.
 * Orphans (parent deleted hard) are promoted to the top level rather than
 * silently dropped.
 */
export function buildCommentTree(rows: CommentWithAuthor[]): CommentNode[] {
  const nodes = new Map<string, CommentNode>();
  for (const row of rows) {
    nodes.set(row.id, { ...row, depth: 0, replyingTo: null, replies: [] });
  }

  const roots: CommentNode[] = [];

  for (const row of rows) {
    const node = nodes.get(row.id)!;
    const parent = row.parent_comment_id
      ? nodes.get(row.parent_comment_id)
      : undefined;

    if (!parent) {
      roots.push(node);
      continue;
    }

    if (parent.depth + 1 > MAX_COMMENT_DEPTH - 1) {
      // Too deep to indent further: hoist to the deepest allowed ancestor.
      let anchor = parent;
      while (anchor.depth > MAX_COMMENT_DEPTH - 1 && anchor.parentRef) {
        anchor = anchor.parentRef;
      }
      node.depth = anchor.depth;
      node.replyingTo = parent.author?.display_name ?? null;
      anchor.replies.push(node);
      node.parentRef = anchor;
    } else {
      node.depth = parent.depth + 1;
      parent.replies.push(node);
      node.parentRef = parent;
    }
  }

  // `parentRef` is a build-time helper only — don't leak it to the client.
  for (const node of nodes.values()) delete node.parentRef;

  return roots;
}

/** Total comments including nested replies. */
export function countComments(nodes: CommentNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countComments(n.replies), 0);
}

/* -------------------------------------------------------------------------- */
/* Likes                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Which of the given targets the current user has already liked.
 *
 * Fetched in one query per page rather than one per like button, so a comment
 * thread with 50 hearts still costs a single round-trip.
 */
export async function getLikedIds(
  userId: string | null,
  targets: {
    articleIds?: string[];
    threadIds?: string[];
    commentIds?: string[];
  },
): Promise<Set<string>> {
  if (!userId) return new Set();

  const { articleIds = [], threadIds = [], commentIds = [] } = targets;
  if (!articleIds.length && !threadIds.length && !commentIds.length) {
    return new Set();
  }

  const supabase = await createClient();

  const filters: string[] = [];
  if (articleIds.length) filters.push(`article_id.in.(${articleIds.join(",")})`);
  if (threadIds.length) filters.push(`thread_id.in.(${threadIds.join(",")})`);
  if (commentIds.length) filters.push(`comment_id.in.(${commentIds.join(",")})`);

  const { data } = await supabase
    .from("likes")
    .select("article_id, thread_id, comment_id")
    .eq("user_id", userId)
    .or(filters.join(","));

  const liked = new Set<string>();
  for (const row of data ?? []) {
    const id = row.article_id ?? row.thread_id ?? row.comment_id;
    if (id) liked.add(id as string);
  }
  return liked;
}

/** Flatten a comment tree to its ids, for the batched like lookup above. */
export function collectCommentIds(nodes: CommentNode[]): string[] {
  return nodes.flatMap((n) => [n.id, ...collectCommentIds(n.replies)]);
}

/* -------------------------------------------------------------------------- */
/* Search                                                                      */
/* -------------------------------------------------------------------------- */

export async function search(
  q: string,
  { limit = 30, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<SearchResult[]> {
  const query = q.trim();
  if (!query) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_all", {
    q: query,
    limit_n: limit,
    offset_n: offset,
  });

  if (error) return [];
  return (data ?? []) as SearchResult[];
}

/* -------------------------------------------------------------------------- */
/* Authoring surfaces                                                          */
/* -------------------------------------------------------------------------- */

/** The signed-in user's own articles, drafts included, for /settings. */
export async function getMyArticles(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("id, title, slug, status, published_at, updated_at, like_count, comment_count")
    .eq("author_id", userId)
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export async function getMyThreads(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("threads")
    .select("id, title, slug, created_at, like_count, comment_count")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
