"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  signIn,
  signInWithGoogle,
  signUp,
  type AuthState,
} from "@/app/actions/auth";
import {
  FieldError,
  FormError,
  FormNotice,
  Input,
  Label,
} from "@/components/ui/Field";
import { cx } from "@/lib/utils";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full cursor-pointer rounded-[10px] bg-primary px-4 py-[13px] text-[15px] font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-55"
    >
      {pending ? "One moment…" : label}
    </button>
  );
}

const TAB =
  "cursor-pointer pb-3.5 text-[15px] font-semibold transition-colors";

/**
 * The mockup's split auth card: testimonial panel on the left, tabbed form on
 * the right. `mode` decides which tab is active; the tabs are real links so
 * each state has its own URL.
 */
export function AuthPanel({
  mode,
  next,
  errorCode,
  googleEnabled = false,
}: {
  mode: "signin" | "signup";
  next: string;
  errorCode?: string;
  googleEnabled?: boolean;
}) {
  const isSignUp = mode === "signup";

  const [state, action] = useActionState<AuthState, FormData>(
    isSignUp ? signUp : signIn,
    {},
  );

  const linkError =
    errorCode === "expired_link"
      ? "That link has expired. Request a new one by signing up again."
      : errorCode === "oauth"
        ? "Google sign-in didn't complete. Please try again."
        : errorCode === "missing_code"
          ? "That sign-in link was incomplete. Please try again."
          : undefined;

  return (
    <div className="mx-auto max-w-[920px] px-6 py-16">
      <div className="grid overflow-hidden rounded-[20px] border border-border md:grid-cols-2">
        {/* Testimonial panel */}
        <div className="flex flex-col justify-between gap-10 bg-primary px-10 py-14">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-on-primary font-serif text-sm font-semibold text-primary"
            >
              N
            </span>
            <span className="font-serif text-lg font-semibold text-on-primary">
              Nordlys
            </span>
          </div>

          <blockquote className="font-serif text-2xl italic leading-[1.45] text-on-primary">
            &ldquo;Finding this community made moving to Malmö feel a lot less
            lonely.&rdquo;
          </blockquote>

          <p className="text-[13.5px] text-on-primary/85">
            — Elin R., member since 2024
          </p>
        </div>

        {/* Form panel */}
        <div className="bg-surface px-8 py-14 sm:px-11">
          <div className="mb-8 flex gap-6 border-b border-border">
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className={cx(
                TAB,
                isSignUp
                  ? "text-ink-soft hover:text-ink"
                  : "border-b-2 border-primary text-ink",
              )}
            >
              Log in
            </Link>
            <Link
              href={`/signup?next=${encodeURIComponent(next)}`}
              className={cx(
                TAB,
                isSignUp
                  ? "border-b-2 border-primary text-ink"
                  : "text-ink-soft hover:text-ink",
              )}
            >
              Sign up
            </Link>
          </div>

          {state.notice ? (
            <div className="mb-4">
              <FormNotice>{state.notice}</FormNotice>
            </div>
          ) : null}

          {linkError || state.error ? (
            <div className="mb-4">
              <FormError>{linkError ?? state.error}</FormError>
            </div>
          ) : null}

          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="next" value={next} />

            {isSignUp ? (
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Your name"
                />
                <FieldError>{state.fields?.name}</FieldError>
              </div>
            ) : null}

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@email.com"
              />
              <FieldError>{state.fields?.email}</FieldError>
            </div>

            <div>
              <Label
                htmlFor="password"
                hint={isSignUp ? "8 characters minimum" : undefined}
              >
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
                minLength={isSignUp ? 8 : undefined}
                placeholder="••••••••"
              />
              <FieldError>{state.fields?.password}</FieldError>
            </div>

            <Submit label={isSignUp ? "Create account" : "Log in"} />
          </form>

          {/* Only offered when the provider is actually configured — a button
              that always renders would hand new members an error page on the
              one screen where they have least patience for it. */}
          {googleEnabled ? (
            <>
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[12.5px] text-ink-soft">or</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <form action={signInWithGoogle}>
                <input type="hidden" name="next" value={next} />
                <button
                  type="submit"
                  className="w-full cursor-pointer rounded-[10px] border border-border bg-surface px-4 py-3 text-[14.5px] font-semibold text-ink transition-colors hover:bg-subtle"
                >
                  Continue with Google
                </button>
              </form>
            </>
          ) : null}

          <p className="mt-5 text-center text-[13.5px] text-ink-muted">
            Reading articles and discussions never requires an account.
          </p>
        </div>
      </div>
    </div>
  );
}
