"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { submitReport } from "@/app/actions/reports";
import { REPORT_REASONS } from "@/lib/constants";

/** Small "Report" affordance with an inline reason picker. Only rendered for
 *  signed-in users looking at someone else's content. */
export function ReportButton({
  kind,
  id,
}: {
  kind: "article" | "thread" | "comment";
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  if (result) {
    return <span className="text-[12.5px] text-ink-soft">{result}</span>;
  }

  function onSubmit(formData: FormData) {
    const reason = String(formData.get("reason") ?? "");
    const note = String(formData.get("note") ?? "");

    startTransition(async () => {
      const res = await submitReport({ kind, id, reason, note });
      setOpen(false);
      setResult(res.message);
    });
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer text-[12.5px] text-ink-soft transition-colors hover:text-danger"
      >
        Report
      </button>

      {open ? (
        <form
          action={onSubmit}
          className="absolute left-0 top-[calc(100%+8px)] z-30 w-72 neu rounded-[18px] bg-surface p-4"
        >
          <p className="mb-2.5 text-[13px] font-semibold text-ink">
            Report this {kind}
          </p>

          <div className="flex flex-col gap-1.5">
            {REPORT_REASONS.map((reason, i) => (
              <label
                key={reason}
                className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-strong"
              >
                <input
                  type="radio"
                  name="reason"
                  value={reason}
                  defaultChecked={i === 0}
                  className="accent-[oklch(0.6_0.14_38)]"
                />
                {reason}
              </label>
            ))}
          </div>

          <textarea
            name="note"
            rows={2}
            maxLength={1000}
            placeholder="Anything else we should know? (optional)"
            className="neu-inset mt-3 w-full resize-y rounded-[12px] bg-surface px-3.5 py-2.5 text-[13px] text-ink"
          />

          <div className="mt-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="grad-primary neu-xs neu-press cursor-pointer rounded-[12px] px-4 py-2 text-[13px] font-semibold text-on-primary transition-all hover:brightness-110 disabled:opacity-55"
            >
              {pending ? "Sending…" : "Submit"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer text-[12.5px] text-ink-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
