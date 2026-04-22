"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { INITIAL_ACTION_STATE, type ActionState } from "@/app/admin/action-types";
import { signUpAction } from "@/app/admin/actions";
import { FormStateMessage } from "@/components/admin/form-state";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" busy={pending} className="w-full">
      Create account
    </Button>
  );
}

export function SignUpForm({
  modeLabel,
}: {
  modeLabel: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    signUpAction,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <div className="app-card-soft rounded-2xl px-4 py-3 text-sm text-[var(--app-muted)]">
        Account mode: {modeLabel}
      </div>
      <label className="grid gap-2">
        <span className="text-sm font-medium text-[var(--app-text)]">Username</span>
        <input
          name="username"
          autoComplete="username"
          className="app-input"
          placeholder="your-name"
        />
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-medium text-[var(--app-text)]">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          className="app-input"
          placeholder="Create a password"
        />
      </label>
      <FormStateMessage error={state.error} success={state.success} />
      <SubmitButton />
      <p className="text-sm text-[var(--app-muted)]">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-[var(--app-text)] underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
