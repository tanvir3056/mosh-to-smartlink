"use client";

import { useActionState, useMemo } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";

import {
  INITIAL_PUBLIC_LEAD_ACTION_STATE,
} from "@/app/public-action-types";
import {
  captureEmailLeadAction,
} from "@/app/public-actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-[0.7rem] border border-[#eee6d6]/18 bg-[#eee6d6] px-5 text-sm font-semibold text-[#111113] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-65"
      style={{ color: "#111113", WebkitTextFillColor: "#111113" }}
    >
      {pending ? "Saving..." : label}
    </button>
  );
}

export function EmailCaptureForm({
  username,
  slug,
  buttonLabel,
}: {
  username: string;
  slug: string;
  buttonLabel: string;
}) {
  const searchParams = useSearchParams();
  const searchString = searchParams?.toString() ?? "";
  const action = useMemo(
    () =>
      captureEmailLeadAction.bind(null, {
        username,
        slug,
        searchString,
      }),
    [username, slug, searchString],
  );
  const [state, formAction] = useActionState(action, INITIAL_PUBLIC_LEAD_ACTION_STATE);
  const isUnlocked = Boolean(state.success && state.downloadUrl);
  const unlockedDownloadUrl = isUnlocked ? state.downloadUrl ?? undefined : undefined;

  return (
    <div className="grid gap-3">
      {isUnlocked ? (
        <div className="grid gap-3">
          <p className="text-sm leading-6 text-emerald-200">
            {state.success}
          </p>
          <a
            href={unlockedDownloadUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 w-fit items-center justify-center rounded-[0.7rem] border border-[#eee6d6]/18 bg-[#eee6d6] px-4 text-sm font-semibold text-[#111113] transition hover:bg-white"
            style={{ color: "#111113", WebkitTextFillColor: "#111113" }}
          >
            {state.downloadLabel ?? "Open reward"}
          </a>
        </div>
      ) : (
        <>
          <form
            action={formAction}
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10.75rem]"
          >
            <label className="grid gap-2">
              <span className="sr-only">Email address</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="min-h-11 rounded-[0.7rem] border border-[#b9ac99] bg-[#eee6d6] px-4 text-[15px] text-[#111113] outline-none transition placeholder:text-[#6f6659] focus:border-[#f04444] focus:bg-white"
                placeholder="Enter your email"
              />
            </label>
            <SubmitButton label={buttonLabel} />
          </form>

          <p className="text-[11px] leading-5 text-[#9f9688]">
            Submit once to unlock the extra and hear about future drops from this artist.
          </p>

          {state.error ? (
            <p className="text-sm text-red-200">
              {state.error}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
