import Link from "next/link";
import { Suspense } from "react";
import { NavLinks } from "@/components/layout/NavLinks";
import { SearchBox } from "@/components/layout/SearchBox";
import { UserMenu } from "@/components/layout/UserMenu";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { ButtonLink } from "@/components/ui/Button";
import { getCurrentProfile } from "@/lib/auth";

export async function Nav() {
  const profile = await getCurrentProfile();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface">
      <div className="mx-auto flex h-[76px] max-w-[1280px] items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 shrink-0 items-center gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-primary font-serif text-base font-semibold text-on-primary"
            >
              N
            </span>
            <span className="whitespace-nowrap font-serif text-[21px] font-semibold tracking-[0.2px] text-ink">
              Nordlys
            </span>
          </Link>

          <Suspense>
            <NavLinks className="hidden md:flex" />
          </Suspense>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <Suspense>
            <SearchBox className="hidden w-[160px] min-w-[90px] shrink lg:flex" />
          </Suspense>

          {profile ? (
            <>
              <ButtonLink href="/write" className="hidden sm:inline-flex">
                + New post
              </ButtonLink>
              <UserMenu profile={profile} />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden px-4 py-[9px] text-sm font-semibold text-ink transition-colors hover:text-primary-ink sm:inline-block"
              >
                Log in
              </Link>
              <ButtonLink href="/signup">Sign up</ButtonLink>
            </>
          )}

          <MobileMenu signedIn={Boolean(profile)} />
        </div>
      </div>
    </header>
  );
}
