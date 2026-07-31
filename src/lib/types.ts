/** Hand-written mirror of the schema in `supabase/migrations/`.
 *
 *  Once the project is linked you can regenerate this from the live database
 *  with:  npx supabase gen types typescript --linked > src/lib/database.types.ts
 *  and re-export from here. Until then these types are the contract. */

export type Role = "member" | "admin";
export type PostStatus = "draft" | "published";
export type ReportStatus = "open" | "resolved" | "dismissed";
export type ContentKind = "article" | "thread" | "comment";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: Role;
  created_at: string;
}

/** The subset of a profile joined onto content rows for bylines. */
export interface AuthorRef {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface Article {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body_md: string;
  cover_url: string | null;
  category: string;
  country: string;
  tags: string[];
  status: PostStatus;
  published_at: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface Thread {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  body_md: string;
  category: string;
  country: string;
  like_count: number;
  comment_count: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  author_id: string;
  article_id: string | null;
  thread_id: string | null;
  parent_comment_id: string | null;
  body_md: string;
  like_count: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  article_id: string | null;
  thread_id: string | null;
  comment_id: string | null;
  reason: string;
  note: string | null;
  status: ReportStatus;
  created_at: string;
}

/* --- Shapes returned by the queries in src/lib/queries.ts ------------------ */

export type ArticleWithAuthor = Article & { author: AuthorRef | null };
export type ThreadWithAuthor = Thread & { author: AuthorRef | null };
export type CommentWithAuthor = Comment & { author: AuthorRef | null };

/** A comment plus its replies, as assembled by buildCommentTree(). */
export interface CommentNode extends CommentWithAuthor {
  depth: number;
  /** Display name of the parent's author, set when a reply is flattened past
   *  MAX_COMMENT_DEPTH so the "replying to X" context isn't lost. */
  replyingTo: string | null;
  replies: CommentNode[];
  /** Build-time back-pointer used while assembling the tree. Deleted before
   *  the tree is returned, so it never crosses the server/client boundary. */
  parentRef?: CommentNode;
}

/** One row from the `search_all` RPC. */
export interface SearchResult {
  kind: ContentKind;
  id: string;
  title: string;
  snippet: string;
  url: string;
  author_name: string | null;
  country: string | null;
  category: string | null;
  created_at: string;
  rank: number;
}

/** Unified feed entry so the home page can interleave articles and threads. */
export interface FeedItem {
  kind: "article" | "thread";
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  country: string;
  author: AuthorRef | null;
  like_count: number;
  comment_count: number;
  published_at: string;
  cover_url: string | null;
  reading_time: string | null;
}
