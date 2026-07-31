/**
 * Adversarial RLS check.
 *
 * Talks straight to the Supabase REST API with the public anon key — no Next.js
 * in the loop — so it proves the rules hold in the database rather than in the
 * app's UI code.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const anon = () =>
  createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });

let pass = 0;
let fail = 0;

function check(name, condition, detail = "") {
  if (condition) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

async function signIn(email) {
  const client = anon();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: "password123",
  });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return { client, userId: data.user.id };
}

/* ---------------------------------------------------------------- guest --- */
console.log("\nGuest (no session)");
{
  const guest = anon();

  const { data: articles } = await guest
    .from("articles")
    .select("id, title, status");
  check("can read published articles", (articles?.length ?? 0) > 0);
  check(
    "sees no drafts",
    (articles ?? []).every((a) => a.status === "published"),
  );

  const { data: threads } = await guest.from("threads").select("id");
  check("can read threads", (threads?.length ?? 0) > 0);

  const { data: comments } = await guest.from("comments").select("id");
  check("can read comments", (comments?.length ?? 0) > 0);

  const { data: results } = await guest.rpc("search_all", {
    q: "CPR",
    limit_n: 10,
    offset_n: 0,
  });
  check("can search", (results?.length ?? 0) > 0);

  const { error: writeErr } = await guest
    .from("comments")
    .insert({ author_id: articles[0].id, article_id: articles[0].id, body_md: "spam" });
  check("cannot post a comment", Boolean(writeErr), writeErr?.message);

  const { error: threadErr } = await guest.from("threads").insert({
    author_id: articles[0].id,
    title: "guest thread",
    slug: "guest-thread",
    body_md: "should not work",
    category: "Culture & Social",
  });
  check("cannot create a thread", Boolean(threadErr), threadErr?.message);

  const { data: likes } = await guest.from("likes").select("id");
  check("cannot enumerate who liked what", (likes?.length ?? 0) === 0);

  const { error: reportErr } = await guest
    .from("reports")
    .select("id");
  const { data: reportRows } = await guest.from("reports").select("id");
  check(
    "cannot read the moderation queue",
    Boolean(reportErr) || (reportRows?.length ?? 0) === 0,
  );
}

/* ------------------------------------------------- cross-user tampering --- */
console.log("\nMember attacking another member's content");
{
  const { client: marta, userId: martaId } = await signIn("marta@nordlys.demo");
  const { userId: tomaszId } = await signIn("tomasz@nordlys.demo");

  const { data: victimArticle } = await marta
    .from("articles")
    .select("id, title, slug")
    .eq("author_id", tomaszId)
    .limit(1)
    .single();

  const { data: updated, error: updateErr } = await marta
    .from("articles")
    .update({ title: "PWNED" })
    .eq("id", victimArticle.id)
    .select();
  check(
    "cannot edit another user's article",
    Boolean(updateErr) || (updated?.length ?? 0) === 0,
    updateErr?.message,
  );

  const { data: deleted } = await marta
    .from("articles")
    .delete()
    .eq("id", victimArticle.id)
    .select();
  check("cannot delete another user's article", (deleted?.length ?? 0) === 0);

  // Confirm the article really is untouched.
  const { data: after } = await marta
    .from("articles")
    .select("title")
    .eq("id", victimArticle.id)
    .single();
  check("victim's article is intact", after?.title !== "PWNED", after?.title);

  const { data: victimComment } = await marta
    .from("comments")
    .select("id")
    .eq("author_id", tomaszId)
    .limit(1)
    .single();

  const { data: cUpd } = await marta
    .from("comments")
    .update({ body_md: "PWNED" })
    .eq("id", victimComment.id)
    .select();
  check("cannot edit another user's comment", (cUpd?.length ?? 0) === 0);

  const { data: cDel } = await marta
    .from("comments")
    .delete()
    .eq("id", victimComment.id)
    .select();
  check("cannot delete another user's comment", (cDel?.length ?? 0) === 0);

  // Impersonation: write a row attributed to someone else.
  const { error: impErr } = await marta.from("comments").insert({
    author_id: tomaszId,
    article_id: victimArticle.id,
    body_md: "posted as Tomasz",
  });
  check("cannot post a comment as another user", Boolean(impErr), impErr?.message);

  const { error: likeImpErr } = await marta
    .from("likes")
    .insert({ user_id: tomaszId, article_id: victimArticle.id });
  check("cannot like as another user", Boolean(likeImpErr), likeImpErr?.message);

  // Privilege escalation.
  const { error: roleErr } = await marta
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", martaId);
  check("cannot promote self to admin", Boolean(roleErr), roleErr?.message);

  const { data: roleAfter } = await marta
    .from("profiles")
    .select("role")
    .eq("id", martaId)
    .single();
  check("role is still member", roleAfter?.role === "member", roleAfter?.role);

  const { error: rpcErr } = await marta.rpc("admin_set_role", {
    target_user: martaId,
    new_role: "admin",
  });
  check("admin_set_role rejects a non-admin", Boolean(rpcErr), rpcErr?.message);

  const { error: statsErr } = await marta.rpc("admin_stats");
  check("admin_stats rejects a non-admin", Boolean(statsErr), statsErr?.message);

  const { error: reportsErr } = await marta.rpc("admin_reports", {
    status_filter: "open",
  });
  check("admin_reports rejects a non-admin", Boolean(reportsErr), reportsErr?.message);
}

/* ------------------------------------------------------- legitimate use --- */
console.log("\nMember doing legitimate things");
{
  const { client: sofie, userId: sofieId } = await signIn("sofie@nordlys.demo");

  const { data: article } = await sofie
    .from("articles")
    .select("id, like_count")
    .eq("slug", "fika-friluftsliv-and-fitting-in")
    .single();

  const before = article.like_count;

  const { error: likeErr } = await sofie
    .from("likes")
    .insert({ user_id: sofieId, article_id: article.id });
  check("can like an article", !likeErr, likeErr?.message);

  const { data: afterLike } = await sofie
    .from("articles")
    .select("like_count")
    .eq("id", article.id)
    .single();
  check(
    "like counter incremented by trigger",
    afterLike.like_count === before + 1,
    `${before} -> ${afterLike.like_count}`,
  );

  const { error: dupErr } = await sofie
    .from("likes")
    .insert({ user_id: sofieId, article_id: article.id });
  check("double-liking is impossible", dupErr?.code === "23505", dupErr?.message);

  await sofie
    .from("likes")
    .delete()
    .eq("user_id", sofieId)
    .eq("article_id", article.id);
  const { data: afterUnlike } = await sofie
    .from("articles")
    .select("like_count")
    .eq("id", article.id)
    .single();
  check(
    "unlike decrements the counter",
    afterUnlike.like_count === before,
    `${afterLike.like_count} -> ${afterUnlike.like_count}`,
  );

  // Comment + reply, and the comment_count trigger.
  const { data: cBefore } = await sofie
    .from("articles")
    .select("comment_count")
    .eq("id", article.id)
    .single();

  const { data: mine, error: mineErr } = await sofie
    .from("comments")
    .insert({ author_id: sofieId, article_id: article.id, body_md: "Verification comment." })
    .select("id")
    .single();
  check("can post a comment", !mineErr, mineErr?.message);

  const { data: reply, error: replyErr } = await sofie
    .from("comments")
    .insert({
      author_id: sofieId,
      article_id: article.id,
      parent_comment_id: mine.id,
      body_md: "Reply to my own comment.",
    })
    .select("id")
    .single();
  check("can reply to a comment", !replyErr, replyErr?.message);

  const { data: cAfter } = await sofie
    .from("articles")
    .select("comment_count")
    .eq("id", article.id)
    .single();
  check(
    "comment counter tracked both",
    cAfter.comment_count === cBefore.comment_count + 2,
    `${cBefore.comment_count} -> ${cAfter.comment_count}`,
  );

  // A reply must live on the same parent surface as the comment it answers.
  const { data: otherThread } = await sofie
    .from("threads")
    .select("id")
    .limit(1)
    .single();
  const { error: graftErr } = await sofie.from("comments").insert({
    author_id: sofieId,
    thread_id: otherThread.id,
    parent_comment_id: mine.id,
    body_md: "grafted onto a different surface",
  });
  check(
    "cannot graft a reply onto a different article/thread",
    Boolean(graftErr),
    graftErr?.message,
  );

  // A comment must belong to exactly one surface.
  const { error: bothErr } = await sofie.from("comments").insert({
    author_id: sofieId,
    article_id: article.id,
    thread_id: otherThread.id,
    body_md: "two parents",
  });
  check("cannot attach a comment to both", Boolean(bothErr), bothErr?.message);

  // Own drafts are visible to their author but nobody else.
  const { data: draft, error: draftErr } = await sofie
    .from("articles")
    .insert({
      author_id: sofieId,
      title: "Verification draft",
      slug: `verification-draft-${Date.now()}`,
      body_md: "not published",
      category: "Housing",
      country: "no",
      status: "draft",
    })
    .select("id")
    .single();
  check("can create a draft", !draftErr, draftErr?.message);

  const { data: ownDraft } = await sofie
    .from("articles")
    .select("id")
    .eq("id", draft.id);
  check("author sees own draft", (ownDraft?.length ?? 0) === 1);

  const guest = anon();
  const { data: guestDraft } = await guest
    .from("articles")
    .select("id")
    .eq("id", draft.id);
  check("guest cannot see the draft", (guestDraft?.length ?? 0) === 0);

  const { client: other } = await signIn("jonas@nordlys.demo");
  const { data: otherDraft } = await other
    .from("articles")
    .select("id")
    .eq("id", draft.id);
  check("another member cannot see the draft", (otherDraft?.length ?? 0) === 0);

  const { data: searchDraft } = await guest.rpc("search_all", {
    q: "Verification draft",
    limit_n: 10,
    offset_n: 0,
  });
  check(
    "draft does not leak through search",
    (searchDraft ?? []).every((r) => r.id !== draft.id),
  );

  // Clean up the verification rows.
  await sofie.from("articles").delete().eq("id", draft.id);
  await sofie.from("comments").delete().eq("id", reply.id);
  await sofie.from("comments").delete().eq("id", mine.id);
}

/* --------------------------------------------------------------- admin --- */
console.log("\nAdmin");
{
  const { client: tomasz } = await signIn("tomasz@nordlys.demo");

  const { data: stats, error: statsErr } = await tomasz.rpc("admin_stats");
  check("admin_stats works for an admin", !statsErr && Boolean(stats?.[0]), statsErr?.message);
  if (stats?.[0]) {
    console.log(
      `      members=${stats[0].total_members} articles=${stats[0].total_articles} ` +
        `threads=${stats[0].total_threads} comments=${stats[0].total_comments}`,
    );
  }

  const { error: repErr } = await tomasz.rpc("admin_reports", { status_filter: "open" });
  check("admin_reports works for an admin", !repErr, repErr?.message);

  // Report -> moderate round trip.
  const { client: jonas, userId: jonasId } = await signIn("jonas@nordlys.demo");
  const { data: target } = await jonas
    .from("comments")
    .select("id")
    .neq("author_id", jonasId)
    .limit(1)
    .single();

  const { error: fileErr } = await jonas.from("reports").insert({
    reporter_id: jonasId,
    comment_id: target.id,
    reason: "Spam or advertising",
    note: "verification run",
  });
  check("member can file a report", !fileErr, fileErr?.message);

  const { data: queue } = await tomasz.rpc("admin_reports", { status_filter: "open" });
  const filed = (queue ?? []).find((r) => r.target_id === target.id);
  check("report appears in the admin queue", Boolean(filed));

  if (filed) {
    const { error: resolveErr } = await tomasz
      .from("reports")
      .update({ status: "resolved" })
      .eq("id", filed.id);
    check("admin can resolve a report", !resolveErr, resolveErr?.message);
    await tomasz.from("reports").delete().eq("id", filed.id);
  }

  // Admin override on someone else's comment.
  const { data: someoneElse } = await tomasz
    .from("comments")
    .select("id, body_md, author_id")
    .neq("author_id", (await signIn("tomasz@nordlys.demo")).userId)
    .limit(1)
    .single();

  const { data: modDel } = await tomasz
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", someoneElse.id)
    .select();
  check("admin can soft-delete any comment", (modDel?.length ?? 0) === 1);

  // Restore it so the seeded data stays intact.
  await tomasz.from("comments").update({ deleted_at: null }).eq("id", someoneElse.id);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
