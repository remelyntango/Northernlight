-- =============================================================================
-- Storage buckets + admin-only RPCs
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Buckets: public read (covers and avatars appear on public pages), writes
-- restricted to the uploading user's own folder.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('covers',  'covers',  true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

-- Objects are stored as "<user-id>/<filename>", so the first path segment is
-- the owner. Everything below keys off that.
create policy "public read of covers and avatars"
  on storage.objects for select
  using (bucket_id in ('covers', 'avatars'));

create policy "users upload to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('covers', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users replace their own files"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('covers', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete their own files"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('covers', 'avatars')
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- =============================================================================
-- Admin RPCs
--
-- The profiles UPDATE policy is deliberately narrow ("id = auth.uid()"), so an
-- admin cannot edit another user's row directly. Role changes therefore go
-- through this SECURITY DEFINER function, which re-checks is_admin() itself.
-- =============================================================================
create function public.admin_set_role(target_user uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can change roles' using errcode = '42501';
  end if;

  if new_role not in ('member', 'admin') then
    raise exception 'Unknown role: %', new_role;
  end if;

  if target_user = auth.uid() and new_role = 'member' then
    raise exception 'You cannot demote yourself' using errcode = '42501';
  end if;

  update public.profiles set role = new_role where id = target_user;
end;
$$;

revoke all on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- Counts for the admin dashboard header, in one round-trip.
create function public.admin_stats()
returns table (
  open_reports  bigint,
  total_members bigint,
  total_articles bigint,
  total_threads bigint,
  total_comments bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can read these stats' using errcode = '42501';
  end if;

  return query
    select
      (select count(*) from public.reports  where status = 'open'),
      (select count(*) from public.profiles),
      (select count(*) from public.articles where status = 'published'),
      (select count(*) from public.threads),
      (select count(*) from public.comments where deleted_at is null);
end;
$$;

revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- Reports joined to a human-readable description of what was reported.
-- SECURITY DEFINER so it can reach across tables; gated on is_admin().
create function public.admin_reports(status_filter text default 'open')
returns table (
  id            uuid,
  kind          text,
  target_id     uuid,
  target_title  text,
  target_excerpt text,
  target_url    text,
  target_author text,
  reason        text,
  note          text,
  status        text,
  reporter_name text,
  created_at    timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can read reports' using errcode = '42501';
  end if;

  return query
    select
      r.id,
      case
        when r.article_id is not null then 'article'
        when r.thread_id  is not null then 'thread'
        else 'comment'
      end as kind,
      coalesce(r.article_id, r.thread_id, r.comment_id) as target_id,
      coalesce(a.title, t.title, 'Comment on ' || coalesce(ca.title, ct.title, 'removed content')) as target_title,
      coalesce(a.excerpt, left(t.body_md, 240), left(c.body_md, 240)) as target_excerpt,
      coalesce(
        '/articles/' || a.slug,
        '/discussions/' || t.slug,
        '/articles/' || ca.slug || '#comment-' || c.id,
        '/discussions/' || ct.slug || '#comment-' || c.id
      ) as target_url,
      coalesce(ap.display_name, tp.display_name, cp.display_name) as target_author,
      r.reason,
      r.note,
      r.status,
      rp.display_name as reporter_name,
      r.created_at
    from public.reports r
    join public.profiles rp on rp.id = r.reporter_id
    left join public.articles a  on a.id  = r.article_id
    left join public.profiles ap on ap.id = a.author_id
    left join public.threads  t  on t.id  = r.thread_id
    left join public.profiles tp on tp.id = t.author_id
    left join public.comments c  on c.id  = r.comment_id
    left join public.profiles cp on cp.id = c.author_id
    left join public.articles ca on ca.id = c.article_id
    left join public.threads  ct on ct.id = c.thread_id
    where status_filter = 'all' or r.status = status_filter
    order by r.created_at desc
    limit 100;
end;
$$;

revoke all on function public.admin_reports(text) from public, anon;
grant execute on function public.admin_reports(text) to authenticated;
