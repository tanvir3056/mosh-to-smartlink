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
      className="inline-flex min-h-12 items-center justify-center rounded-[0.95rem] bg-[#101215] px-5 text-sm font-semibold text-white transition hover:bg-[#191d22] disabled:cursor-not-allowed disabled:opacity-65"
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
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
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
            className="min-h-11 rounded-[0.9rem] border border-[#d7cdbd] bg-[#fffdf7] px-4 text-[15px] text-[#181b20] outline-none transition placeholder:text-[#827b70] focus:border-[#181b20]"
            placeholder="Enter your email"
          />
        </label>
        <SubmitButton label={buttonLabel} />
      </form>

      <p className="text-[11px] leading-5 text-[#6d6557]">
        Submit once to unlock the extra and hear about future drops from this artist.
      </p>

      <Message state={state} />

      {state.downloadUrl ? (
        <a
          href={state.downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center justify-center rounded-[0.95rem] border border-[#d8cdbd] bg-[#fffdf7] px-4 py-3 text-sm font-semibold text-[#181b20] transition hover:border-[#c9bca9] hover:bg-white"
        >
          {state.downloadLabel ?? "Open reward"}
        </a>
      ) : null}
    </div>
  );
}
