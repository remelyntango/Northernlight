"use client";

import { useFormStatus } from "react-dom";
import { deleteThread } from "@/app/actions/threads";

function Inner() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (
          !confirm(
            "Delete this discussion? All of its replies will be deleted too.",
          )
        ) {
          e.preventDefault();
        }
      }}
      className="cursor-pointer text-sm text-ink-muted transition-colors hover:text-danger disabled:opacity-55"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

export function DeleteThreadButton({ id }: { id: string }) {
  return (
    <form action={deleteThread} className="inline">
      <input type="hidden" name="id" value={id} />
      <Inner />
    </form>
  );
}
