-- =============================================================================
-- Highlight the snippet over the same text that was matched.
--
-- The first version generated an article's snippet from `excerpt` alone while
-- the tsvector indexed title + excerpt + body. A search for "CPR" therefore
-- matched the body, but ts_headline found nothing to highlight in the excerpt
-- and returned an unmarked lead-in — the result looked unrelated to the query.
--
-- Highlighting over title + excerpt + body guarantees the matched term is
-- present, so every result shows *why* it matched.
-- =============================================================================

create or replace function public.search_all(
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
      ts_headline(
        'english',
        public.html_escape(
          a.title || E'\n\n' || coalesce(a.excerpt, '') || E'\n\n' || a.body_md
        ),
        query.ts,
        headline_opts.opts
      ) as snippet,
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
      ts_headline(
        'english',
        public.html_escape(t.title || E'\n\n' || t.body_md),
        query.ts,
        headline_opts.opts
      ),
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
      -- Damp comment ranks so a matching article outranks a passing mention of
      -- the same term in its comment section.
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
