# Nordlys

A community portal for people living abroad in Scandinavia — Denmark, Norway and Sweden.

- **Anyone** can read and search articles, discussions and comments. No account required.
- **Members** can publish articles, start discussions, comment, reply and like.
- **Admins** can moderate reported content and manage roles.

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | Articles are server-rendered, so crawlers and link previews see real HTML. Server Actions remove the need for a separate API layer. |
| Database | Supabase (Postgres) | Search across three content types is a core requirement — Postgres full-text search handles it with no external search service. The data is relational (articles → comments → replies, likes across three target types). |
| Auth | Supabase Auth | Email/password + Google, cookie sessions via `@supabase/ssr`. |
| Authorisation | Row Level Security | "Anyone reads, only the author writes" is enforced *in the database*, so it holds even against direct REST calls with the anon key. |
| Storage | Supabase Storage | Cover images and avatars, resized client-side before upload. |
| Styling | Tailwind v4 | Design tokens from the Claude Design mockup live in `@theme` in `src/app/globals.css`. |

## Getting started

```bash
npm install
cp .env.example .env.local     # fill in from Supabase → Project Settings → API
npm run dev
```

Then apply the schema (see **Database** below) and open http://localhost:3000.

### Environment

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon/public key |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally; your domain in production |

The anon key is safe in the browser — it grants nothing on its own, because every
request it makes is filtered by RLS. **Never** put the `service_role` key in a
`NEXT_PUBLIC_` variable.

## Database

Schema lives in `supabase/migrations/`, versioned in git.

**Against a cloud project** (no Docker needed):

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**Locally** (requires Docker Desktop):

```bash
npx supabase start
npx supabase db reset   # applies migrations
```

### Demo content

```bash
export SUPABASE_SERVICE_ROLE_KEY=$(npx supabase projects api-keys \
  --project-ref <ref> --output-format json \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>\
      console.log(JSON.parse(s).keys.find(k=>k.id==='service_role').api_key))")

ALLOW_REMOTE_SEED=1 npm run seed
```

Creates six accounts (password `password123`), three articles, four threads and
a nested comment tree. `tomasz@nordlys.demo` is the admin. Re-running wipes and
recreates the demo data, so it's safe to repeat.

The service_role key bypasses RLS entirely — never commit it, never expose it to
the browser, and never point this script at production. The `ALLOW_REMOTE_SEED`
guard exists so you can't do that by accident.

## Verification

Two scripts check the parts that matter, against whatever project `.env.local`
points at:

```bash
npm run verify:rls   # 41 checks — talks straight to the REST API, no Next.js
npm run verify:app   # 23 checks — drives the running app over HTTP (needs `npm run dev`)
```

`verify:rls` is adversarial: it signs in as one member and tries to edit, delete
and impersonate another's content, escalate to admin, read the moderation queue,
and see unpublished drafts. All of it must fail. Run it after touching any
policy.

## Known limits

**Email delivery is rate-limited.** Supabase's built-in SMTP allows only a couple
of messages per hour, which is fine for development but *will* block real
signups. Before launch, either configure a custom SMTP provider under
**Authentication → Emails** (Resend, Postmark and SendGrid all work), or turn off
email confirmation under **Authentication → Providers → Email**.

**Google sign-in needs setup.** The button is wired up, but the provider must be
enabled under **Authentication → Providers → Google** with a client ID and
secret, and `<site>/auth/callback` added to the allowed redirect URLs.

### Schema at a glance

- `profiles` — one per auth user, created by a trigger on `auth.users`. Carries `role` (`member` | `admin`).
- `articles` — long-form posts with `status` (`draft` | `published`), category, country, tags, cover image.
- `threads` — discussion posts.
- `comments` — attached to *either* an article or a thread (enforced by a `CHECK`), optionally nested under `parent_comment_id`.
- `likes` — one row per user per target, where the target is exactly one of article / thread / comment. Partial unique indexes make double-liking impossible.
- `reports` — moderation queue.

**Counters.** `like_count`, `comment_count` and `last_activity_at` are maintained by
triggers rather than counted per query, which turns "trending discussions" and any
popularity sort into a plain indexed `ORDER BY`.

**Search.** Each content table has a generated `tsvector` column with a GIN index.
The `search_all(q, limit, offset)` function unions all three into one ranked result
set with `ts_headline` snippets. One RPC call powers `/search`.

> Snippets are rendered as HTML so the `<mark>` highlights survive. `ts_headline`
> does *not* escape its input, so the SQL escapes the body **before** highlighting
> (`html_escape`), and `sanitizeSnippet` re-escapes on the render side and re-admits
> only `<mark>`. Both locks are deliberate — the alternative is stored XSS from any
> comment body.

### Creating the first admin

Roles can only be changed by an existing admin, so bootstrap the first one by hand
in the SQL Editor:

```sql
update public.profiles set role = 'admin' where id = '<your-user-uuid>';
```

After that, `/admin` has a **Make admin** button for everyone else.

## Project layout

```
src/
  app/
    actions/            Server Actions — auth, articles, threads, comments, likes, reports, admin
    articles/[slug]/    Article reader
    discussions/        Thread list, composer, thread reader
    search/             Public search results
    write/[id]/         Markdown editor
    admin/              Moderation queue
    settings/           Your posts + profile
  components/
    ui/                 Button, Chip, Badge, Avatar, Card, Field primitives
    layout/             Nav, footer, search box, user menu
    content/            Prose renderer, feed cards, comment tree, like + report buttons
    editor/             Article editor, thread composer, image upload
  lib/
    supabase/           Browser / server / proxy clients
    queries.ts          All reads
    auth.ts             Current profile (request-cached)
  proxy.ts              Session refresh + route guards (Next 16's middleware)
supabase/
  migrations/           Schema, RLS, triggers, search
  seed.sql              Demo content — dev only
```

## Security model

Application code is convenience; the database is the boundary.

- Every table has RLS enabled. Server Actions do not re-implement ownership checks — they let the policy reject the write, so the two can't drift apart.
- `is_admin()` is `SECURITY DEFINER` to avoid infinite recursion when a `profiles` policy needs to read `profiles`.
- Role escalation is blocked by a trigger (`guard_role_change`), not just by policy, so a user rewriting their own profile row still can't make themselves an admin.
- User-authored Markdown is rendered through `rehype-sanitize`; `dangerouslySetInnerHTML` appears exactly once, for search snippets, behind two layers of escaping.
- Redirect targets (`?next=`) are validated as same-site relative paths everywhere they're accepted.

To verify: sign in as one user and try to edit or delete another user's article
via a direct REST call with the anon key. It must fail with a policy violation.

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run start    # serve the build
npm run lint     # eslint
npx tsc --noEmit # typecheck
```

## Design

The visual design comes from the Claude Design project *Nordlys Portal*. Colours,
type scale and component shapes are transcribed into `@theme` tokens in
`src/app/globals.css` — that file is the single source of truth, so restyling
happens in one place.

Typefaces: **Lora** (headings) and **Public Sans** (body), loaded via `next/font`.
