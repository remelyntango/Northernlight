-- =============================================================================
-- Nordlys — initial schema
--
-- Design notes:
--   * Reads are public for published content; writes are restricted to the
--     author (or an admin) by Row Level Security, so the rules hold even for a
--     client hitting the REST API directly with the anon key.
--   * like_count / comment_count are denormalised and maintained by triggers.
--     This is what makes "trending discussions" and popularity sorts a plain
--     indexed ORDER BY rather than a correlated subquery per row.
--   * Full-text search uses generated tsvector columns + GIN indexes, unioned
--     by the search_all() function. No external search service required.
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text        not null check (char_length(display_name) between 2 and 60),
  avatar_url   text,
  bio          text        check (bio is null or char_length(bio) <= 400),
  role         text        not null default 'member' check (role in ('member', 'admin')),
  created_at   timestamptz not null default now()
);

comment on table public.profiles is
  'Public profile per auth user. Created automatically by handle_new_user().';

-- Mirror new auth users into profiles. SECURITY DEFINER because the trigger
-- runs as the (unprivileged) signing-up user, who has no insert grant here.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin check used by policies across every table.
--
-- SECURITY DEFINER is essential: a plain `select role from profiles` inside a
-- policy ON profiles would re-enter that policy and recurse infinitely.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- articles
-- -----------------------------------------------------------------------------
create table public.articles (
  id           uuid        primary key default gen_random_uuid(),
  author_id    uuid        not null references public.profiles (id) on delete cascade,
  title        text        not null check (char_length(title) between 3 and 160),
  slug         text        not null unique check (slug ~ '^[a-z0-9-]+$'),
  excerpt      text        check (excerpt is null or char_length(excerpt) <= 320),
  body_md      text        not null default '' check (char_length(body_md) <= 60000),
  cover_url    text,
  category     text        not null,
  country      text        not null default 'all' check (country in ('all', 'dk', 'no', 'se')),
  tags         text[]      not null default '{}' check (array_length(tags, 1) is null or array_length(tags, 1) <= 5),
  status       text        not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  like_count    integer    not null default 0,
  comment_count integer    not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Tags are flattened by subscript rather than array_to_string(), which is
  -- only STABLE (it depends on the element type's output function) and so is
  -- rejected in a generated column. Subscripting is IMMUTABLE, and the check
  -- constraint above caps tags at 5, so this covers every tag.
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')),   'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body_md, '')), 'C') ||
    setweight(to_tsvector('english',
      coalesce(tags[1], '') || ' ' || coalesce(tags[2], '') || ' ' ||
      coalesce(tags[3], '') || ' ' || coalesce(tags[4], '') || ' ' ||
      coalesce(tags[5], '')), 'B')
  ) stored,
  -- A published article must have a publish date; the trigger below sets it.
  constraint articles_published_has_date
    check (status <> 'published' or published_at is not null)
);

create index articles_search_idx      on public.articles using gin (search_vector);
create index articles_published_idx   on public.articles (published_at desc) where status = 'published';
create index articles_country_idx     on public.articles (country) where status = 'published';
create index articles_category_idx    on public.articles (category) where status = 'published';
create index articles_author_idx      on public.articles (author_id);
create index articles_tags_idx        on public.articles using gin (tags);

-- -----------------------------------------------------------------------------
-- threads
-- -----------------------------------------------------------------------------
create table public.threads (
  id           uuid        primary key default gen_random_uuid(),
  author_id    uuid        not null references public.profiles (id) on delete cascade,
  title        text        not null check (char_length(title) between 3 and 160),
  slug         text        not null unique check (slug ~ '^[a-z0-9-]+$'),
  body_md      text        not null check (char_length(body_md) between 1 and 20000),
  category     text        not null,
  country      text        not null default 'all' check (country in ('all', 'dk', 'no', 'se')),
  like_count    integer    not null default 0,
  comment_count integer    not null default 0,
  last_activity_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')),   'A') ||
    setweight(to_tsvector('english', coalesce(body_md, '')), 'B')
  ) stored
);

create index threads_search_idx   on public.threads using gin (search_vector);
create index threads_activity_idx on public.threads (last_activity_at desc);
create index threads_replies_idx  on public.threads (comment_count desc);
create index threads_country_idx  on public.threads (country);
create index threads_category_idx on public.threads (category);
create index threads_author_idx   on public.threads (author_id);

-- -----------------------------------------------------------------------------
-- comments  (on an article OR a thread, optionally nested under a parent)
-- -----------------------------------------------------------------------------
create table public.comments (
  id                uuid        primary key default gen_random_uuid(),
  author_id         uuid        not null references public.profiles (id) on delete cascade,
  article_id        uuid        references public.articles (id) on delete cascade,
  thread_id         uuid        references public.threads  (id) on delete cascade,
  parent_comment_id uuid        references public.comments (id) on delete cascade,
  body_md           text        not null check (char_length(body_md) between 1 and 8000),
  like_count        integer     not null default 0,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector('english', coalesce(body_md, ''))
  ) stored,
  -- Exactly one parent surface.
  constraint comments_one_target check (
    (article_id is not null and thread_id is null) or
    (article_id is null and thread_id is not null)
  )
);

create index comments_search_idx  on public.comments using gin (search_vector);
create index comments_article_idx on public.comments (article_id, created_at);
create index comments_thread_idx  on public.comments (thread_id, created_at);
create index comments_parent_idx  on public.comments (parent_comment_id);
create index comments_author_idx  on public.comments (author_id);

-- A reply must live on the same article/thread as the comment it replies to.
-- Without this, a client could graft a reply onto a comment in another thread.
create function public.check_comment_parent()
returns trigger
language plpgsql
as $$
declare
  parent record;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  select article_id, thread_id into parent
  from public.comments where id = new.parent_comment_id;

  if parent is null then
    raise exception 'Parent comment does not exist';
  end if;

  if parent.article_id is distinct from new.article_id
     or parent.thread_id is distinct from new.thread_id then
    raise exception 'Reply must belong to the same article or thread as its parent';
  end if;

  return new;
end;
$$;

create trigger comments_parent_check
  before insert or update on public.comments
  for each row execute function public.check_comment_parent();

-- -----------------------------------------------------------------------------
-- likes  (one row per user per target; target is one of three FKs)
-- -----------------------------------------------------------------------------
create table public.likes (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  article_id uuid        references public.articles (id) on delete cascade,
  thread_id  uuid        references public.threads  (id) on delete cascade,
  comment_id uuid        references public.comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint likes_one_target check (
    (article_id is not null)::int +
    (thread_id  is not null)::int +
    (comment_id is not null)::int = 1
  )
);

-- Partial unique indexes are what actually make "like" idempotent; the UI's
-- optimistic toggle is only cosmetic.
create unique index likes_article_uniq on public.likes (user_id, article_id) where article_id is not null;
create unique index likes_thread_uniq  on public.likes (user_id, thread_id)  where thread_id  is not null;
create unique index likes_comment_uniq on public.likes (user_id, comment_id) where comment_id is not null;

-- -----------------------------------------------------------------------------
-- reports
-- -----------------------------------------------------------------------------
create table public.reports (
  id          uuid        primary key default gen_random_uuid(),
  reporter_id uuid        not null references public.profiles (id) on delete cascade,
  article_id  uuid        references public.articles (id) on delete cascade,
  thread_id   uuid        references public.threads  (id) on delete cascade,
  comment_id  uuid        references public.comments (id) on delete cascade,
  reason      text        not null,
  note        text        check (note is null or char_length(note) <= 1000),
  status      text        not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at  timestamptz not null default now(),
  constraint reports_one_target check (
    (article_id is not null)::int +
    (thread_id  is not null)::int +
    (comment_id is not null)::int = 1
  )
);

create index reports_status_idx on public.reports (status, created_at desc);
-- One open report per user per target keeps the queue from being flooded.
create unique index reports_article_uniq on public.reports (reporter_id, article_id) where article_id is not null and status = 'open';
create unique index reports_thread_uniq  on public.reports (reporter_id, thread_id)  where thread_id  is not null and status = 'open';
create unique index reports_comment_uniq on public.reports (reporter_id, comment_id) where comment_id is not null and status = 'open';

-- =============================================================================
-- Triggers: updated_at, publish stamp, counters
-- =============================================================================

create function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger articles_touch before update on public.articles
  for each row execute function public.touch_updated_at();
create trigger threads_touch before update on public.threads
  for each row execute function public.touch_updated_at();
create trigger comments_touch before update on public.comments
  for each row execute function public.touch_updated_at();

-- Stamp published_at the first time an article goes live.
create function public.stamp_published_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;

create trigger articles_stamp_published before insert or update on public.articles
  for each row execute function public.stamp_published_at();

-- Comment counters + thread activity timestamp.
create function public.sync_comment_counts()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target record;
  delta  integer;
begin
  if tg_op = 'INSERT' then
    target := new; delta := 1;
  elsif tg_op = 'DELETE' then
    target := old; delta := -1;
  else
    -- Soft delete / restore toggles the count without removing the row.
    if (old.deleted_at is null) = (new.deleted_at is null) then
      return new;
    end if;
    target := new;
    delta  := case when new.deleted_at is null then 1 else -1 end;
  end if;

  if target.article_id is not null then
    update public.articles
       set comment_count = greatest(0, comment_count + delta)
     where id = target.article_id;
  else
    update public.threads
       set comment_count    = greatest(0, comment_count + delta),
           last_activity_at = case when delta > 0 then now() else last_activity_at end
     where id = target.thread_id;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger comments_count_sync
  after insert or delete or update of deleted_at on public.comments
  for each row execute function public.sync_comment_counts();

-- Like counters.
create function public.sync_like_counts()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target record;
  delta  integer;
begin
  if tg_op = 'INSERT' then
    target := new; delta := 1;
  else
    target := old; delta := -1;
  end if;

  if target.article_id is not null then
    update public.articles set like_count = greatest(0, like_count + delta) where id = target.article_id;
  elsif target.thread_id is not null then
    update public.threads  set like_count = greatest(0, like_count + delta) where id = target.thread_id;
  else
    update public.comments set like_count = greatest(0, like_count + delta) where id = target.comment_id;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger likes_count_sync
  after insert or delete on public.likes
  for each row execute function public.sync_like_counts();

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.articles enable row level security;
alter table public.threads  enable row level security;
alter table public.comments enable row level security;
alter table public.likes    enable row level security;
alter table public.reports  enable row level security;

-- profiles: world-readable (bylines), self-editable.
create policy "profiles are public"
  on public.profiles for select using (true);

create policy "users update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Only an admin may change the `role` column, and only via the admin RPC below.
-- (The update policy above still lets a user rewrite their own row, so guard
--  role escalation with a trigger rather than a policy.)
create function public.guard_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only an admin can change roles';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_role_change();

-- articles: published ones are public; drafts only to their author (or admin).
create policy "published articles are public"
  on public.articles for select
  using (status = 'published' or author_id = auth.uid() or public.is_admin());

create policy "users create own articles"
  on public.articles for insert to authenticated
  with check (author_id = auth.uid());

create policy "authors update own articles"
  on public.articles for update to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

create policy "authors delete own articles"
  on public.articles for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- threads
create policy "threads are public"
  on public.threads for select using (true);

create policy "users create own threads"
  on public.threads for insert to authenticated
  with check (author_id = auth.uid());

create policy "authors update own threads"
  on public.threads for update to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

create policy "authors delete own threads"
  on public.threads for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- comments
create policy "comments are public"
  on public.comments for select using (true);

create policy "users create own comments"
  on public.comments for insert to authenticated
  with check (author_id = auth.uid());

create policy "authors update own comments"
  on public.comments for update to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

create policy "authors delete own comments"
  on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- likes: a user can see only their own. Public like *counts* come from the
-- denormalised like_count columns, so nothing needs to read the whole table —
-- and keeping it private means "who liked this" isn't world-readable.
create policy "users read own likes"
  on public.likes for select to authenticated
  using (user_id = auth.uid());

create policy "users like as themselves"
  on public.likes for insert to authenticated
  with check (user_id = auth.uid());

create policy "users remove own likes"
  on public.likes for delete to authenticated
  using (user_id = auth.uid());

-- reports: write-only for members, readable by admins.
create policy "users file own reports"
  on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());

create policy "admins read reports"
  on public.reports for select to authenticated
  using (public.is_admin());

create policy "admins resolve reports"
  on public.reports for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- Search
-- =============================================================================

-- ts_headline does NOT escape its input — it just wraps matched terms in the
-- delimiters you give it. Since article and comment bodies are user-authored,
-- the source text must be escaped BEFORE highlighting, or a comment containing
-- "<script>" would come back as live markup in the search results.
create function public.html_escape(input text)
returns text
language sql
immutable
parallel safe
as $$
  select replace(replace(replace(coalesce(input, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
$$;

-- One call searches articles, threads and comments and returns a common shape,
-- ranked. `snippet` comes back with <mark> around the matched terms — and those
-- are the only tags in it, thanks to html_escape() above.
create function public.search_all(
  q        text,
  limit_n  integer default 20,
  offset_n integer default 0
)
returns table (
  kind        text,
  id          uuid,
  title       text,
  snippet     text,
  url         text,
  author_name text,
  country     text,
  category    text,
  created_at  timestamptz,
  rank        real
)
language sql
stable
security invoker
set search_path = public
as $$
  with query as (
    select websearch_to_tsquery('english', q) as ts
  ),
  headline_opts as (
    select 'StartSel=<mark>, StopSel=</mark>, MaxFragments=1, MaxWords=32, MinWords=12, FragmentDelimiter= … '::text as opts
  )
  select * from (
    select
      'article'::text as kind,
      a.id,
      a.title,
      ts_headline('english', public.html_escape(coalesce(a.excerpt, a.body_md)), query.ts, headline_opts.opts) as snippet,
      '/articles/' || a.slug as url,
      p.display_name as author_name,
      a.country,
      a.category,
      coalesce(a.published_at, a.created_at) as created_at,
      ts_rank(a.search_vector, query.ts) as rank
    from public.articles a
    join public.profiles p on p.id = a.author_id
    cross join query cross join headline_opts
    where a.status = 'published' and a.search_vector @@ query.ts

    union all

    select
      'thread'::text,
      t.id,
      t.title,
      ts_headline('english', public.html_escape(t.body_md), query.ts, headline_opts.opts),
      '/discussions/' || t.slug,
      p.display_name,
      t.country,
      t.category,
      t.created_at,
      ts_rank(t.search_vector, query.ts)
    from public.threads t
    join public.profiles p on p.id = t.author_id
    cross join query cross join headline_opts
    where t.search_vector @@ query.ts

    union all

    -- Comments link back to their parent page with an anchor.
    select
      'comment'::text,
      c.id,
      coalesce('Re: ' || a.title, 'Re: ' || t.title) as title,
      ts_headline('english', public.html_escape(c.body_md), query.ts, headline_opts.opts),
      coalesce('/articles/' || a.slug, '/discussions/' || t.slug) || '#comment-' || c.id,
      p.display_name,
      coalesce(a.country, t.country),
      coalesce(a.category, t.category),
      c.created_at,
      -- Damp comment ranks slightly so a matching article outranks a passing
      -- mention of the same term in its comment section.
      ts_rank(c.search_vector, query.ts) * 0.6
    from public.comments c
    join public.profiles p on p.id = c.author_id
    left join public.articles a on a.id = c.article_id and a.status = 'published'
    left join public.threads  t on t.id = c.thread_id
    cross join query cross join headline_opts
    where c.deleted_at is null
      and c.search_vector @@ query.ts
      and (a.id is not null or t.id is not null)
  ) results
  where length(trim(coalesce(q, ''))) > 0
  order by rank desc, created_at desc
  limit least(greatest(limit_n, 1), 100)
  offset greatest(offset_n, 0);
$$;

-- =============================================================================
-- Home feed: articles and threads interleaved by recency in one query.
-- =============================================================================
create view public.feed_items
with (security_invoker = true)
as
  select
    'article'::text as kind,
    a.id, a.title, a.slug,
    coalesce(a.excerpt, left(a.body_md, 200)) as excerpt,
    a.category, a.country, a.author_id,
    a.like_count, a.comment_count,
    a.cover_url,
    -- Reading time at ~200 wpm, computed here so the feed doesn't have to ship
    -- whole article bodies to the client just to count words.
    greatest(1, round(array_length(regexp_split_to_array(trim(a.body_md), '\s+'), 1) / 200.0))::int as read_minutes,
    coalesce(a.published_at, a.created_at) as published_at
  from public.articles a
  where a.status = 'published'
  union all
  select
    'thread'::text,
    t.id, t.title, t.slug,
    left(t.body_md, 200),
    t.category, t.country, t.author_id,
    t.like_count, t.comment_count,
    null::text,
    null::int,
    t.created_at
  from public.threads t;

comment on view public.feed_items is
  'Unified article+thread stream for the home feed. security_invoker keeps the
   underlying RLS policies in force (drafts stay hidden).';
