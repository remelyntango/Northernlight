"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toggleLike } from "@/app/actions/likes";
import { cx } from "@/lib/utils";

/**
 * Heart + count. Updates optimistically so the click feels instant, then
 * reconciles against the server result. Signed-out visitors are sent to the
 * login page rather than shown a disabled control.
 */
export function LikeButton({
  kind,
  id,
  count,
  liked,
  signedIn,
  size = "md",
  returnTo,
}: {
  kind: "article" | "thread" | "comment";
  id: string;
  count: number;
  liked: boolean;
  signedIn: boolean;
  size?: "sm" | "md";
  returnTo?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [state, setState] = useOptimistic(
    { liked, count },
    (_current, next: { liked: boolean; count: number }) => next,
  );

  function onClick() {
    if (!signedIn) {
      const next = returnTo ?? window.location.pathname;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    setError(null);

    startTransition(async () => {
      const wasLiked = state.liked;
      setState({
        liked: !wasLiked,
        count: Math.max(0, state.count + (wasLiked ? -1 : 1)),
      });

      const result = await toggleLike({ kind, id, liked: wasLiked });

      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        // Pull the true state back from the server.
        router.refresh();
        return;
      }

      // Keep the server as the source of truth for the next interaction.
      router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={state.liked}
        aria-label={state.liked ? "Remove like" : "Like"}
        className={cx(
          "inline-flex cursor-pointer items-center gap-1.5 transition-colors",
          size === "sm" ? "text-[12.5px]" : "text-sm",
          state.liked
            ? "font-bold text-liked"
            : "text-ink-muted hover:text-liked",
        )}
      >
        <span aria-hidden="true">{state.liked ? "♥" : "♡"}</span>
        <span>{state.count}</span>
      </button>
      {error ? (
        <span role="alert" className="text-[12px] text-danger">
          {error}
        </span>
      ) : null}
    </span>
  );
}
