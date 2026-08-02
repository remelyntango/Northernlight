import Link from "next/link";
import { COUNTRIES } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-6 py-12 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-primary font-display text-[13px] font-semibold text-on-primary"
            >
              N
            </span>
            <span className="font-display text-lg font-semibold text-ink">
              Nordlys
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Real stories and honest advice from expats across Denmark, Norway
            and Sweden.
          </p>
        </div>

        <div className="flex gap-12">
          <nav aria-label="Browse">
            <h2 className="mb-3 text-[13px] font-semibold text-ink">Browse</h2>
            <ul className="flex flex-col gap-2 text-sm text-ink-muted">
              <li>
                <Link href="/articles" className="hover:text-primary-ink">
                  Articles
                </Link>
              </li>
              <li>
                <Link href="/discussions" className="hover:text-primary-ink">
                  Discussions
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-primary-ink">
                  Search
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Countries">
            <h2 className="mb-3 text-[13px] font-semibold text-ink">
              Countries
            </h2>
            <ul className="flex flex-col gap-2 text-sm text-ink-muted">
              {COUNTRIES.filter((c) => c.value !== "all").map((c) => (
                <li key={c.value}>
                  <Link
                    href={`/?country=${c.value}`}
                    className="hover:text-primary-ink"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      <div className="border-t border-border">
        <p className="mx-auto max-w-[1280px] px-6 py-5 text-[13px] text-ink-soft">
          Reading articles and discussions never requires an account.
        </p>
      </div>
    </footer>
  );
}
