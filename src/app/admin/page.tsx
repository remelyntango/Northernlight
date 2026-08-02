import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card, EmptyState } from "@/components/ui/Card";
import { ChipLink } from "@/components/ui/Chip";
import {
  adminDeleteContent,
  resolveReport,
  setUserRole,
} from "@/app/actions/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Moderation",
  robots: { index: false },
};

interface AdminReport {
  id: string;
  kind: "article" | "thread" | "comment";
  target_id: string;
  target_title: string;
  target_excerpt: string | null;
  target_url: string | null;
  target_author: string | null;
  reason: string;
  note: string | null;
  status: string;
  reporter_name: string;
  created_at: string;
}

const FILTERS = ["open", "resolved", "dismissed", "all"] as const;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/admin");
  if (profile.role !== "admin") redirect("/");

  const { status } = await searchParams;
  const filter = FILTERS.includes(status as never) ? status! : "open";

  const supabase = await createClient();

  const [{ data: stats }, { data: reports }, { data: members }] =
    await Promise.all([
      supabase.rpc("admin_stats"),
      supabase.rpc("admin_reports", { status_filter: filter }),
      supabase
        .from("profiles")
        .select("id, display_name, role, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const counts = stats?.[0];
  const rows = (reports ?? []) as AdminReport[];

  return (
    <div className="mx-auto max-w-[900px] px-6 pb-24 pt-12">
      <header className="mb-8">
        <h1 className="font-display text-[30px] font-medium text-ink">
          Moderation
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Signed in as {profile.display_name} · administrator
        </p>
      </header>

      {counts ? (
        <div className="mb-9 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Open reports", value: counts.open_reports },
            { label: "Members", value: counts.total_members },
            { label: "Articles", value: counts.total_articles },
            { label: "Threads", value: counts.total_threads },
            { label: "Comments", value: counts.total_comments },
          ].map((stat) => (
            <div
              key={stat.label}
              className="neu-sm rounded-[16px] bg-surface px-4 py-3.5"
            >
              <p className="font-display text-2xl font-medium text-ink">
                {stat.value}
              </p>
              <p className="text-[12.5px] text-ink-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      ) : null}

      <section className="mb-12">
        <h2 className="mb-4 font-display text-lg font-medium text-ink">Reports</h2>

        <nav aria-label="Filter reports" className="mb-5 flex flex-wrap gap-2.5">
          {FILTERS.map((f) => (
            <ChipLink
              key={f}
              href={f === "open" ? "/admin" : `/admin?status=${f}`}
              active={filter === f}
            >
              {f[0].toUpperCase() + f.slice(1)}
            </ChipLink>
          ))}
        </nav>

        {rows.length > 0 ? (
          <div className="flex flex-col gap-4">
            {rows.map((report) => (
              <Card key={report.id} className="p-5">
                <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
                  <Badge
                    tone={report.kind === "article" ? "primary" : report.kind === "thread" ? "accent" : "neutral"}
                  >
                    {report.kind}
                  </Badge>
                  <span className="text-[13px] font-semibold text-danger">
                    {report.reason}
                  </span>
                  <span className="text-[12.5px] text-ink-soft">
                    reported by {report.reporter_name} ·{" "}
                    {timeAgo(report.created_at)}
                  </span>
                  {report.status !== "open" ? (
                    <Badge tone="neutral">{report.status}</Badge>
                  ) : null}
                </div>

                <p className="font-display text-[17px] font-medium text-ink">
                  {report.target_url ? (
                    <Link href={report.target_url} className="hover:text-primary-ink">
                      {report.target_title}
                    </Link>
                  ) : (
                    report.target_title
                  )}
                </p>

                {report.target_excerpt ? (
                  <p className="mt-1 line-clamp-3 text-[14px] leading-relaxed text-ink-muted">
                    {report.target_excerpt}
                  </p>
                ) : null}

                <p className="mt-1 text-[12.5px] text-ink-soft">
                  by {report.target_author ?? "unknown"}
                </p>

                {report.note ? (
                  <p className="neu-inset mt-3 rounded-[12px] bg-surface px-4 py-3 text-[13.5px] text-ink-strong">
                    “{report.note}”
                  </p>
                ) : null}

                {report.status === "open" ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                    <form action={adminDeleteContent}>
                      <input type="hidden" name="kind" value={report.kind} />
                      <input type="hidden" name="id" value={report.target_id} />
                      <input type="hidden" name="reportId" value={report.id} />
                      <button
                        type="submit"
                        className="neu-sm neu-press cursor-pointer rounded-full bg-surface px-4 py-2 text-[13px] font-semibold text-danger transition-all hover:brightness-105"
                      >
                        Delete content
                      </button>
                    </form>

                    <form action={resolveReport}>
                      <input type="hidden" name="id" value={report.id} />
                      <input type="hidden" name="status" value="resolved" />
                      <button
                        type="submit"
                        className="cursor-pointer rounded-full bg-primary px-4 py-1.5 text-[13px] font-semibold text-on-primary hover:bg-primary-hover"
                      >
                        Mark resolved
                      </button>
                    </form>

                    <form action={resolveReport}>
                      <input type="hidden" name="id" value={report.id} />
                      <input type="hidden" name="status" value="dismissed" />
                      <button
                        type="submit"
                        className="cursor-pointer text-[13px] text-ink-muted underline hover:text-ink"
                      >
                        Dismiss
                      </button>
                    </form>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title={`No ${filter === "all" ? "" : filter} reports`}>
            {filter === "open"
              ? "Nothing needs your attention right now."
              : "Nothing in this bucket."}
          </EmptyState>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-display text-lg font-medium text-ink">Members</h2>
        <Card className="p-0">
          <ul>
            {(members ?? []).map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3.5 last:border-b-0"
              >
                <div>
                  <p className="text-[15px] font-medium text-ink">
                    {member.display_name}
                  </p>
                  <p className="text-[12.5px] text-ink-soft">
                    joined {timeAgo(member.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Badge tone={member.role === "admin" ? "primary" : "neutral"}>
                    {member.role}
                  </Badge>
                  {member.id !== profile.id ? (
                    <form action={setUserRole}>
                      <input type="hidden" name="userId" value={member.id} />
                      <input
                        type="hidden"
                        name="role"
                        value={member.role === "admin" ? "member" : "admin"}
                      />
                      <button
                        type="submit"
                        className="neu-sm neu-press cursor-pointer rounded-full bg-surface px-4 py-2 text-[12.5px] font-semibold text-ink-label transition-all hover:text-ink"
                      >
                        {member.role === "admin" ? "Demote" : "Make admin"}
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
