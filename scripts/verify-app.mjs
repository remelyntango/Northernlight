/**
 * End-to-end check of the running Next.js app.
 *
 * Signs a real user in through Supabase, converts the session into the cookie
 * format @supabase/ssr expects, and then drives the app over HTTP as that user
 * — so this exercises the proxy, the server components and the RLS policies
 * together, not just the database.
 *
 *   npm run dev            # in one terminal
 *   npm run verify:app     # in another
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
const APP = process.env.APP_URL ?? "http://localhost:3000";

let pass = 0;
let fail = 0;

function check(name, ok, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/**
 * @supabase/ssr stores the session as a base64-encoded JSON blob under
 * `sb-<project-ref>-auth-token`, splitting it into `.0`, `.1`, … chunks when it
 * exceeds the cookie size limit. Reproducing that here lets plain fetch calls
 * authenticate exactly the way a browser would.
 */
function sessionCookie(session) {
  const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
  const name = `sb-${ref}-auth-token`;
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64")}`;

  const CHUNK = 3180;
  if (value.length <= CHUNK) return `${name}=${value}`;

  const parts = [];
  for (let i = 0; i * CHUNK < value.length; i++) {
    parts.push(`${name}.${i}=${value.slice(i * CHUNK, (i + 1) * CHUNK)}`);
  }
  return parts.join("; ");
}

async function get(path, cookie) {
  const res = await fetch(`${APP}${path}`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
  return { status: res.status, location: res.headers.get("location"), body: await res.text() };
}

/* ------------------------------------------------------- fresh sign-up --- */
console.log("\nSign-up (the real path a new member takes)");

// Note: Supabase rejects some domains outright (example.com, .test, .invalid),
// so use a plausible one.
const newEmail = `verify-${Date.now()}@nordlys.demo`;
const anon = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });

const { data: signUpData, error: signUpErr } = await anon.auth.signUp({
  email: newEmail,
  password: "verify-password-123",
  options: { data: { display_name: "Verification User" } },
});

// Supabase's built-in SMTP allows only a couple of messages per hour. Hitting
// that limit means the request got all the way to "send the confirmation
// email", so the signup path itself is fine — it's the mail transport that is
// throttled. Report it rather than calling it a failure.
const rateLimited = /rate limit/i.test(signUpErr?.message ?? "");

if (rateLimited) {
  console.log(
    `  ⚠ signUp reached the email step but the built-in SMTP is rate limited.\n` +
      `      This WILL block real signups in production. Configure a custom SMTP\n` +
      `      provider under Authentication → Emails, or disable email confirmation.`,
  );
} else {
  check("signUp succeeds", !signUpErr, signUpErr?.message);
}

if (signUpData?.user) {
  console.log(
    `      email confirmation is ${signUpData.session ? "OFF — signed in immediately" : "ON — no session until the link is opened"}`,
  );

  // The on_auth_user_created trigger should have written the profile.
  const { data: profile } = await anon
    .from("profiles")
    .select("display_name, role")
    .eq("id", signUpData.user.id)
    .maybeSingle();
  check("profile row created by trigger", profile?.display_name === "Verification User", JSON.stringify(profile));
  check("new users are not admins", profile?.role === "member", profile?.role);
}

/* ------------------------------------------------- signed-in browsing --- */
console.log("\nSigned in as a member (marta)");

const { data: sess, error: signInErr } = await anon.auth.signInWithPassword({
  email: "marta@nordlys.demo",
  password: "password123",
});
if (signInErr) {
  console.error(`  ✗ could not sign in: ${signInErr.message}`);
  process.exit(1);
}
const cookie = sessionCookie(sess.session);

{
  const home = await get("/", cookie);
  check("home renders", home.status === 200);
  check("nav shows the member's controls", home.body.includes("New post"), "expected a '+ New post' button");
  check("nav no longer offers sign-up", !home.body.includes(">Sign up<"));

  const write = await get("/write", cookie);
  check("/write is reachable when signed in", write.status === 200, `status ${write.status}`);
  check("editor renders", write.body.includes("Write an article"));

  const compose = await get("/discussions/new", cookie);
  check("/discussions/new is reachable", compose.status === 200);

  const settings = await get("/settings", cookie);
  check("/settings is reachable", settings.status === 200);
  check("settings lists the member's threads", settings.body.includes("Copenhagen"), "expected marta's seeded thread");

  const admin = await get("/admin", cookie);
  check("/admin is blocked for a non-admin", admin.status === 307 && admin.location?.endsWith("/"), `status ${admin.status} -> ${admin.location}`);

  const article = await get("/articles/cracking-the-danish-cpr-number-a-survival-guide", cookie);
  check("comment box replaces the log-in prompt", !article.body.includes("to join the conversation"));
  check("comment form is present", article.body.includes("Add a comment"));
  check("reply controls are present", article.body.includes(">Reply<"));

  const login = await get("/login", cookie);
  check("signed-in users are bounced off /login", login.status === 307, `status ${login.status}`);
}

/* --------------------------------------------------------------- admin --- */
console.log("\nSigned in as the admin (tomasz)");
{
  const adminClient = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  const { data: adminSess } = await adminClient.auth.signInWithPassword({
    email: "tomasz@nordlys.demo",
    password: "password123",
  });
  const adminCookie = sessionCookie(adminSess.session);

  const admin = await get("/admin", adminCookie);
  check("/admin renders for an admin", admin.status === 200, `status ${admin.status}`);
  check("moderation queue is shown", admin.body.includes("Moderation"));
  check("member list is shown", admin.body.includes("Members"));
  check("stats are shown", /Open reports/.test(admin.body));

  const own = await get("/articles/cracking-the-danish-cpr-number-a-survival-guide", adminCookie);
  check("author sees an Edit link on their own article", own.body.includes(">Edit<"));
}

/* ------------------------------------------------------------- guests --- */
console.log("\nGuest");
{
  const home = await get("/");
  check("home renders", home.status === 200);
  check("nav offers sign-up", home.body.includes("Sign up"));

  const article = await get("/articles/fika-friluftsliv-and-fitting-in");
  check("article is readable", article.status === 200);
  check("log-in prompt replaces the comment box", article.body.includes("to join the conversation"));

  const search = await get("/search?q=fika");
  check("search works without an account", search.status === 200 && search.body.includes("<mark>"));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
