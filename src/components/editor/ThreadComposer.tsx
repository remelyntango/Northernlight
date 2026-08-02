"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createThread, type ThreadState } from "@/app/actions/threads";
import {
  FieldError,
  FormError,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/Field";
import { CATEGORIES, COUNTRIES } from "@/lib/constants";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="grad-primary neu-xs neu-press cursor-pointer rounded-[16px] px-6 py-3 text-sm font-semibold text-on-primary transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
    >
      {pending ? "Posting…" : "Post discussion"}
    </button>
  );
}

export function ThreadComposer() {
  const [state, action] = useActionState<ThreadState, FormData>(
    createThread,
    {},
  );

  return (
    <div className="mx-auto max-w-[760px] px-6 pb-24 pt-12">
      <header className="mb-7">
        <h1 className="font-display text-[30px] font-medium text-ink">
          Start a discussion
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Ask a question or share something you have figured out. Threads are
          public and readable by anyone.
        </p>
      </header>

      <form action={action} className="flex flex-col gap-5">
        {state.error ? <FormError>{state.error}</FormError> : null}

        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            defaultValue={state.values?.title ?? ""}
            required
            maxLength={160}
            placeholder="How long did your work permit actually take?"
            className="font-display text-lg"
          />
          <FieldError>{state.fields?.title}</FieldError>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="category">Topic</Label>
            <Select
              id="category"
              name="category"
              defaultValue={state.values?.category ?? CATEGORIES[0]}
              required
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <FieldError>{state.fields?.category}</FieldError>
          </div>

          <div>
            <Label htmlFor="country">Country</Label>
            <Select
              id="country"
              name="country"
              defaultValue={state.values?.country ?? "all"}
            >
              {COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
            <FieldError>{state.fields?.country}</FieldError>
          </div>
        </div>

        <div>
          <Label htmlFor="body" hint="Markdown supported">
            What&apos;s on your mind?
          </Label>
          <Textarea
            id="body"
            name="body"
            defaultValue={state.values?.body ?? ""}
            rows={10}
            required
            maxLength={20000}
            placeholder="Give people enough context to help — where you are, what you have already tried, what you are actually stuck on."
          />
          <FieldError>{state.fields?.body}</FieldError>
        </div>

        <div className="flex items-center gap-4 border-t border-border pt-5">
          <Submit />
          <Link
            href="/discussions"
            className="text-[13px] text-ink-muted underline hover:text-ink"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
