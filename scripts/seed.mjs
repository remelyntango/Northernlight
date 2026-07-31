/**
 * Development seed — loads the content from the Nordlys design mockup.
 *
 *   npm run seed
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY, because it creates auth users and writes
 * rows on their behalf. That key bypasses Row Level Security entirely, so this
 * script must never run against production and the key must never be committed
 * or exposed to the browser.
 *
 * Fetch the key without printing it:
 *   export SUPABASE_SERVICE_ROLE_KEY=$(npx supabase projects api-keys \
 *     --project-ref <ref> --output-format json \
 *     | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>\
 *       console.log(JSON.parse(s).keys.find(k=>k.id==='service_role').api_key))")
 *
 * Idempotent: deletes the demo accounts (and everything they own, via cascade)
 * before recreating them, so it can be re-run freely.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

/* --- config -------------------------------------------------------------- */

function env(name) {
  const value = process.env[name];
  if (value) return value;

  // Fall back to .env.local so `npm run seed` works without exporting the URL.
  try {
    const file = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const match = file.match(new RegExp(`^${name}=(.*)$`, "m"));
    if (match) return match[1].trim();
  } catch {
    /* no .env.local — fall through to the error below */
  }

  console.error(`Missing ${name}.`);
  process.exit(1);
}

const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");

if (/\.supabase\.co/.test(SUPABASE_URL) && process.env.ALLOW_REMOTE_SEED !== "1") {
  console.error(
    `Refusing to seed a hosted project by accident.\n` +
      `  Target: ${SUPABASE_URL}\n` +
      `  Re-run with ALLOW_REMOTE_SEED=1 if that is really what you want.`,
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/* --- fixtures ------------------------------------------------------------ */

const PASSWORD = "password123";
const DOMAIN = "nordlys.demo";

const PEOPLE = [
  {
    key: "tomasz",
    name: "Tomasz Kowalski",
    role: "admin",
    bio: "Moved to Aarhus in 2021. Writes about the paperwork nobody warns you about.",
  },
  {
    key: "priya",
    name: "Priya Sharma",
    bio: "Product manager in Stockholm. Interested in how work culture translates.",
  },
  {
    key: "elin",
    name: "Elin Rask",
    bio: "Swedish-Norwegian, back home after eight years abroad. Community moderator at heart.",
  },
  { key: "marta", name: "Marta Rossi" },
  { key: "jonas", name: "Jonas Lindqvist" },
  { key: "sofie", name: "Sofie Berg" },
];

const days = (n) => new Date(Date.now() - n * 864e5).toISOString();
const hours = (n) => new Date(Date.now() - n * 36e5).toISOString();

const ARTICLES = [
  {
    author: "tomasz",
    title: "Cracking the Danish CPR Number: A Survival Guide",
    slug: "cracking-the-danish-cpr-number-a-survival-guide",
    excerpt:
      "Everything to sort before — and right after — your first appointment at Borgerservice.",
    category: "Visas & Residence",
    country: "dk",
    tags: ["Denmark", "CPR", "Paperwork"],
    published_at: days(4),
    body_md: `Every Dane knows their ten digits by heart, and soon enough, you will too. Your CPR number unlocks almost everything here — the doctor, the bank, your apartment lease, even the library card for your kid.

The catch: you can only apply once you have a permanent address and, in most cases, a job offer or study place already lined up. Book your appointment at the Borgerservice the moment your lease is signed — slots fill up fast in the bigger cities.

> "Bring every document twice — the original and a copy. I learned that the hard way in Aarhus."

Once it arrives, download MitID immediately. It's the single login that ties your tax return, health record and mailbox together — and half the country's services are unreachable without it.

## What to bring

- Your passport, plus a photocopy of the photo page
- Your rental contract, signed by both parties
- Your employment contract or letter of admission
- Your EU residence document, or your residence permit
- Your marriage certificate and children's birth certificates, if they apply

## After the appointment

The yellow health card (*sundhedskort*) arrives by post within two to three weeks and lists your assigned doctor. You can switch doctors online later for a small fee, so don't panic if the assignment looks inconvenient.

Register with **e-Boks** on the same day you get MitID. Danish authorities consider digital post legally delivered whether or not you have ever opened it, and the first letters — tax card, health card, sometimes a fine — start arriving straight away.`,
  },
  {
    author: "priya",
    title: "Salary Negotiation the Swedish Way",
    slug: "salary-negotiation-the-swedish-way",
    excerpt:
      "Why asking for more upfront works differently in Stockholm than it did back home.",
    category: "Jobs & Work",
    country: "se",
    tags: ["Sweden", "Salary", "Work culture"],
    published_at: days(9),
    body_md: `The first thing to understand is that the negotiation is not the confrontation you may be bracing for. Swedish workplaces run on *lagom* — the sense that things should be balanced rather than maximised — and an aggressive opening number reads as a misjudgement of the room rather than as confidence.

That does not mean you should accept the first offer. It means the argument has to be built differently.

## Anchor on data, not on ambition

Union wage statistics are public. Unionen and Akademikerförbundet SSR both publish salary tables broken down by role, region and years of experience. Quoting the median for your bracket is not considered rude — it is considered doing your homework.

> "I asked for 8% and framed it entirely around the published median for my role. My manager agreed in the same meeting."

## The annual review is the real negotiation

Most Swedish companies run a *lönerevision* once a year, often collectively negotiated. Your leverage at hiring time is real but bounded; your leverage in the review cycle compounds. Ask early what the review timeline is, and what specifically would move you up a band.

## Things that are negotiable besides money

- Occupational pension contribution above the collective agreement minimum
- Extra vacation days beyond the statutory 25
- A stated budget for training and conferences
- Flexible or compressed hours — far more freely given here than a raise`,
  },
  {
    author: "elin",
    title: "Fika, Friluftsliv and Fitting In",
    slug: "fika-friluftsliv-and-fitting-in",
    excerpt: "Small rituals that make Nordic small talk feel a little less small.",
    category: "Culture & Social",
    country: "se",
    tags: ["Sweden", "Culture", "Friendship"],
    published_at: days(16),
    body_md: `Newcomers often describe Nordic social life as a closed door. It is more accurate to say the door opens on a schedule, and nobody thinks to tell you what the schedule is.

## Fika is not a coffee break

It is a structured pause, usually twice a day, and it is where a surprising amount of workplace belonging is negotiated. Declining it to keep working reads as slightly antisocial — the opposite of the signal most newcomers think they are sending.

Show up. Bring something to share on your birthday, because in Sweden the birthday person brings the cake.

## Friluftsliv gives you a script

The single most reliable way to make Nordic friends is to join something that happens outdoors on a repeating schedule: an orienteering club, a Tuesday run group, a cabin trip, a mushroom-picking outing in September.

The reason is structural, not mystical. Conversation is much easier when it is a side effect of a shared activity than when it is the activity itself.

> "Finding this community made moving to Malmö feel a lot less lonely."

## Silence is not rejection

The pause after you finish speaking is not disapproval and it is not an invitation to fill the space. It is thinking time. Learning to sit in it comfortably is, genuinely, half of fitting in.`,
  },
];

const THREADS = [
  {
    author: "jonas",
    title: "Anyone else struggling with the silence on Oslo trains?",
    slug: "anyone-else-struggling-with-the-silence-on-oslo-trains",
    category: "Culture & Social",
    country: "no",
    created_at: days(3),
    body_md:
      "Coming from a chattier culture, the quiet still catches me off guard two years in. Nobody talks, nobody makes eye contact, and if you sit next to someone when there are free seats elsewhere it feels like a minor social violation. Is this something you get used to, or do you just stop noticing?",
  },
  {
    author: "marta",
    title: "Best neighborhoods in Copenhagen for families?",
    slug: "best-neighborhoods-in-copenhagen-for-families",
    category: "Culture & Social",
    country: "dk",
    created_at: days(6),
    body_md:
      "Looking at Frederiksberg vs Østerbro — would love input from anyone with young kids. Main things we care about: getting a daycare spot without a two-year wait, a safe cycling route to school, and not paying quite so much that we can never visit home. Open to areas we have not thought of.",
  },
  {
    author: "priya",
    title: "How long did your work permit actually take?",
    slug: "how-long-did-your-work-permit-actually-take",
    category: "Visas & Residence",
    country: "se",
    created_at: days(12),
    body_md:
      "Migrationsverket says 4 months, curious what people have really experienced lately. Applied in March with a complete application through a certified employer and still waiting. Trying to work out whether to chase it or whether that just moves you to the back of a different queue.",
  },
  {
    author: "sofie",
    title: "Is it normal to get almost no feedback in performance reviews?",
    slug: "is-it-normal-to-get-almost-no-feedback-in-performance-reviews",
    category: "Jobs & Work",
    country: "no",
    created_at: days(20),
    body_md:
      "My Norwegian manager barely commented on my first review and I cannot tell if that is good. Back home a review with nothing in it would have been a warning sign. Here I genuinely do not know how to read it.",
  },
];

/** `parent` refers to an earlier comment's `key` — this is what produces the
 *  nested reply chains the UI renders. */
const COMMENTS = [
  { key: "c1", author: "marta", article: 0, created_at: hours(3),
    body: "The MitID tip saved me — I would have wasted a whole week without it." },
  { key: "c2", author: "jonas", article: 0, created_at: days(1),
    body: "Aarhus Borgerservice books up two weeks out, so agreed on booking early." },
  { key: "c3", author: "sofie", article: 0, created_at: days(2),
    body: "Wish I had read this before my appointment — brought only one copy of everything!" },
  { key: "c4", author: "tomasz", article: 0, parent: "c3", created_at: hours(47),
    body: "They will usually photocopy on the spot if you ask nicely, but it adds twenty minutes to the appointment." },
  { key: "c5", author: "sofie", article: 0, parent: "c4", created_at: hours(46),
    body: "Good to know for next time. The queue system alone was an experience." },
  { key: "c6", author: "elin", article: 1, created_at: days(5),
    body: "The union statistics point is the one I wish I had known. It completely changes the tone of the conversation." },

  { key: "d1", author: "elin", thread: 0, created_at: days(2),
    body: "You stop noticing, and then one day you visit home and find the noise on public transport genuinely stressful. It goes both ways." },
  { key: "d2", author: "tomasz", thread: 0, created_at: hours(3),
    body: "It is not coldness, it is a norm about not imposing on strangers. Once I reframed it that way it stopped feeling personal." },
  { key: "d3", author: "jonas", thread: 0, parent: "d2", created_at: hours(2),
    body: "That reframing helps, thank you. Two years in and I still read it as being disliked." },
  { key: "d4", author: "elin", thread: 1, created_at: hours(5),
    body: "Østerbro if you want the parks and can stretch the budget; Frederiksberg has the better daycare availability in my experience. Also look at Valby — cheaper and quietly excellent for families." },
  { key: "d5", author: "tomasz", thread: 2, created_at: days(1),
    body: "Mine took five months and two weeks last year, certified employer as well. Chasing did nothing. The case worker told me directly that the queue is by submission date, full stop." },
  { key: "d6", author: "elin", thread: 3, created_at: days(2),
    body: 'No news is genuinely good news here. Criticism is usually delivered as a question rather than a statement, so re-read anything phrased as "have you considered".' },
];

const LIKES = [
  { article: 0, by: ["priya", "elin", "marta", "jonas", "sofie"] },
  { article: 1, by: ["elin", "marta"] },
  { thread: 0, by: ["tomasz", "elin", "sofie"] },
  { comment: "c1", by: ["tomasz", "jonas", "sofie"] },
  { comment: "c3", by: ["priya", "marta"] },
  { comment: "d2", by: ["marta", "sofie"] },
];

/* --- helpers ------------------------------------------------------------- */

function die(step, error) {
  if (!error) return;
  console.error(`\n✗ ${step}\n  ${error.message ?? error}`);
  process.exit(1);
}

/* --- run ----------------------------------------------------------------- */

console.log(`Seeding ${SUPABASE_URL}\n`);

// 1. Remove any previous demo accounts. Deleting the auth user cascades through
//    profiles -> articles/threads/comments/likes, so this fully resets the data.
const { data: existing, error: listError } = await db.auth.admin.listUsers({
  perPage: 1000,
});
die("listing users", listError);

const stale = existing.users.filter((u) => u.email?.endsWith(`@${DOMAIN}`));
for (const user of stale) {
  const { error } = await db.auth.admin.deleteUser(user.id);
  die(`deleting ${user.email}`, error);
}
if (stale.length) console.log(`· removed ${stale.length} previous demo account(s)`);

// 2. Create the demo accounts. The on_auth_user_created trigger writes the
//    matching profiles row from display_name.
const ids = {};
for (const person of PEOPLE) {
  const email = `${person.key}@${DOMAIN}`;
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: person.name },
  });
  die(`creating ${email}`, error);
  ids[person.key] = data.user.id;
}
console.log(`· created ${PEOPLE.length} accounts (password: ${PASSWORD})`);

// 3. Fill in bios and promote the admin.
for (const person of PEOPLE) {
  if (!person.bio && !person.role) continue;
  const { error } = await db
    .from("profiles")
    .update({ bio: person.bio ?? null, role: person.role ?? "member" })
    .eq("id", ids[person.key]);
  die(`updating profile for ${person.key}`, error);
}
console.log(`· ${PEOPLE.find((p) => p.role === "admin").name} is the site admin`);

// 4. Articles.
const { data: articleRows, error: articleError } = await db
  .from("articles")
  .insert(
    ARTICLES.map((a) => ({
      author_id: ids[a.author],
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt,
      body_md: a.body_md,
      category: a.category,
      country: a.country,
      tags: a.tags,
      status: "published",
      published_at: a.published_at,
      created_at: a.published_at,
    })),
  )
  .select("id, slug");
die("inserting articles", articleError);

// Preserve fixture order — insert() does not guarantee it.
const articleIds = ARTICLES.map(
  (a) => articleRows.find((r) => r.slug === a.slug).id,
);
console.log(`· ${articleIds.length} articles`);

// 5. Threads.
const { data: threadRows, error: threadError } = await db
  .from("threads")
  .insert(
    THREADS.map((t) => ({
      author_id: ids[t.author],
      title: t.title,
      slug: t.slug,
      body_md: t.body_md,
      category: t.category,
      country: t.country,
      created_at: t.created_at,
      last_activity_at: t.created_at,
    })),
  )
  .select("id, slug");
die("inserting threads", threadError);

const threadIds = THREADS.map(
  (t) => threadRows.find((r) => r.slug === t.slug).id,
);
console.log(`· ${threadIds.length} threads`);

// 6. Comments. Parents must exist before their replies, so insert in waves by
//    depth rather than all at once.
const commentIds = {};
let remaining = [...COMMENTS];
let wave = 0;

while (remaining.length) {
  const ready = remaining.filter((c) => !c.parent || commentIds[c.parent]);
  if (!ready.length) die("inserting comments", new Error("unresolvable parent reference"));

  const { data, error } = await db
    .from("comments")
    .insert(
      ready.map((c) => ({
        author_id: ids[c.author],
        article_id: c.article !== undefined ? articleIds[c.article] : null,
        thread_id: c.thread !== undefined ? threadIds[c.thread] : null,
        parent_comment_id: c.parent ? commentIds[c.parent] : null,
        body_md: c.body,
        created_at: c.created_at,
      })),
    )
    .select("id, body_md");
  die("inserting comments", error);

  for (const c of ready) {
    commentIds[c.key] = data.find((r) => r.body_md === c.body).id;
  }

  remaining = remaining.filter((c) => !commentIds[c.key]);
  wave++;
}
console.log(`· ${COMMENTS.length} comments (${wave} nesting levels)`);

// 7. Likes. The triggers on this table are what populate every like_count.
const likeRows = LIKES.flatMap((l) =>
  l.by.map((who) => ({
    user_id: ids[who],
    article_id: l.article !== undefined ? articleIds[l.article] : null,
    thread_id: l.thread !== undefined ? threadIds[l.thread] : null,
    comment_id: l.comment ? commentIds[l.comment] : null,
  })),
);
const { error: likeError } = await db.from("likes").insert(likeRows);
die("inserting likes", likeError);
console.log(`· ${likeRows.length} likes`);

console.log(`\n✓ Seed complete.`);
console.log(`  Sign in as any of: ${PEOPLE.map((p) => `${p.key}@${DOMAIN}`).join(", ")}`);
console.log(`  Password: ${PASSWORD}`);
console.log(`  Admin: tomasz@${DOMAIN}`);
