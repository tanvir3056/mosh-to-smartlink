"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";

import {
  INITIAL_PUBLIC_LEAD_ACTION_STATE,
  type PublicLeadActionState,
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
      className="inline-flex min-h-11 items-center justify-center rounded-[0.9rem] bg-[#f4efe4] px-5 text-sm font-semibold text-[#171a1f] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-65"
    >
      {pending ? "Saving..." : label}
    </button>
  );
}

function Message({
  state,
}: {
  state: PublicLeadActionState;
}) {
  if (!state.error && !state.success) {
    return null;
  }

  return (
    <div
      className={`rounded-[1rem] border px-4 py-3 text-sm ${
        state.error
          ? "border-red-400/30 bg-red-500/10 text-red-200"
          : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
      }`}
    >
      {state.error ?? state.success}
    </div>
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
  const action = captureEmailLeadAction.bind(null, {
    username,
    slug,
    searchString: searchParams?.toString() ?? "",
  });
  const [state, formAction] = useActionState(action, INITIAL_PUBLIC_LEAD_ACTION_STATE);

  return (
    <div className="grid gap-3">
      <form action={formAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="grid gap-2">
          <span className="sr-only">Email address</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="min-h-11 rounded-[0.9rem] border border-white/10 bg-[#0d1015] px-4 text-[15px] text-white outline-none transition placeholder:text-white/34 focus:border-white/28"
            placeholder="Enter your email"
          />
        </label>
        <SubmitButton label={buttonLabel} />
      </form>

      <p className="text-[11px] leading-5 text-white/42">
        Submit once to unlock the extra and hear about future drops from this artist.
      </p>

      <Message state={state} />

      {state.downloadUrl ? (
        <a
          href={state.downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center justify-center rounded-[0.9rem] border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/18 hover:bg-white/10"
        >
          {state.downloadLabel ?? "Open reward"}
        </a>
      ) : null}
    </div>
  );
}
