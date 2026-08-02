import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[560px] px-6 py-28 text-center">
      <p className="font-mono text-sm text-ink-soft">404</p>
      <h1 className="mb-3 mt-2 font-display text-[34px] font-medium text-ink">
        We couldn&apos;t find that page.
      </h1>
      <p className="mb-8 text-[15px] leading-relaxed text-ink-muted">
        The link may be out of date, or the post may have been removed.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <ButtonLink href="/">Back to the feed</ButtonLink>
        <Link
          href="/search"
          className="px-4 py-2.5 text-sm font-semibold text-ink-muted underline hover:text-primary-ink"
        >
          Search instead
        </Link>
      </div>
    </div>
  );
}
