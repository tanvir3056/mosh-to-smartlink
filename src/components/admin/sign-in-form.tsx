"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { INITIAL_ACTION_STATE, type ActionState } from "@/app/admin/action-types";
import { signInAction } from "@/app/admin/actions";
import { FormStateMessage } from "@/components/admin/form-state";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" busy={pending} className="w-full">
      Sign in
    </Button>
  );
}

export function SignInForm({
  email,
  modeLabel,
}: {
  email: string;
  modeLabel: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    signInAction,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="email" value={email} />
      <div className="app-note text-sm">
        Sign-in mode: {modeLabel}
      </div>
      <label className="grid gap-2">
        <span className="text-sm text-[var(--app-muted)]">Admin email</span>
        <input
          name="email_display"
          value={email}
          readOnly
          className="app-input"
        />
      </label>
      <label className="grid gap-2">
        <span className="text-sm text-[var(--app-muted)]">Password</span>
        <input
          name="password"
          type="password"
          className="app-input"
          placeholder="Enter the admin password"
        />
      </label>
      <FormStateMessage error={state.error} success={state.success} />
      <SubmitButton />
    </form>
  );
}
