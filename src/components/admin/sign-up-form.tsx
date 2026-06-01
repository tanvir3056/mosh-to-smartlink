"use client";

import { Shield, User } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { INITIAL_ACTION_STATE, type ActionState } from "@/app/admin/action-types";
import { signUpAction } from "@/app/admin/actions";
import { FormStateMessage } from "@/components/admin/form-state";
import { Button } from "@/components/ui/button";
import { APP_DOMAIN_HINT } from "@/lib/constants";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" busy={pending} className="w-full">
      Create account
    </Button>
  );
}

export function SignUpForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    signUpAction,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2">
        <span className="text-sm font-medium text-[var(--app-text)]">Username</span>
        <span className="app-input flex items-center gap-2 px-3">
          <User className="h-4 w-4 shrink-0 text-[var(--app-muted-2)]" />
          <span className="font-mono text-sm text-[var(--app-muted-2)]">
            {APP_DOMAIN_HINT}/
          </span>
          <input
            name="username"
            autoComplete="username"
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)]"
            placeholder="yourname"
          />
        </span>
        <span className="text-[12.5px] text-[var(--app-muted-2)]">
          This becomes the root of all your links.
        </span>
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-medium text-[var(--app-text)]">Password</span>
        <span className="app-input flex items-center gap-2 px-3">
          <Shield className="h-4 w-4 shrink-0 text-[var(--app-muted-2)]" />
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)]"
            placeholder="At least 8 characters"
          />
        </span>
        <span className="text-[12.5px] text-[var(--app-muted-2)]">
          Use 8+ characters.
        </span>
      </label>
      <FormStateMessage error={state.error} success={state.success} />
      <SubmitButton />
      <p className="text-center text-[11.5px] leading-5 text-[var(--app-muted-2)]">
        By creating an account you agree to the Terms and acknowledge the Privacy Policy.
      </p>
    </form>
  );
}
