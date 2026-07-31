-- =============================================================================
-- Let trusted server-side contexts set roles.
--
-- guard_role_change() originally required is_admin() for ANY role change. That
-- is right for browser traffic, but it also blocks the bootstrap case: the very
-- first admin has to be promoted by something that isn't yet an admin.
--
-- A service_role connection (a server-side script, or a direct SQL session) has
-- already bypassed RLS entirely by definition — it is not a privilege boundary
-- worth defending here. Browser callers still arrive as `anon` or
-- `authenticated` and remain subject to the is_admin() check.
--
-- Note that anon can't reach this trigger anyway: the profiles UPDATE policy
-- requires `id = auth.uid()`, which never holds when auth.uid() is null.
-- =============================================================================

create or replace function public.guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    -- auth.role() is null on a direct superuser SQL session; treat that, and an
    -- explicit service_role JWT, as trusted.
    if coalesce(auth.role(), 'service_role') <> 'service_role'
       and not public.is_admin() then
      raise exception 'Only an admin can change roles' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;
