"use client";

import Link from "next/link";
import { Shield, User } from "lucide-react";
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

export function SignInForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    signInAction,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <div className="flex justify-center">
        <span className="app-chip">
          <Shield className="h-3.5 w-3.5" />
          Secure session · username + password
        </span>
      </div>
      <label className="grid gap-2">
        <span className="text-sm font-medium text-[var(--app-text)]">Username</span>
        <span className="app-input flex items-center gap-2 px-3">
          <User className="h-4 w-4 shrink-0 text-[var(--app-muted-2)]" />
          <span className="font-mono text-sm text-[var(--app-muted-2)]">@</span>
          <input
            name="username"
            autoComplete="username"
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)]"
            placeholder="yourname"
          />
        </span>
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-medium text-[var(--app-text)]">Password</span>
        <span className="app-input flex items-center gap-2 px-3">
          <Shield className="h-4 w-4 shrink-0 text-[var(--app-muted-2)]" />
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)]"
            placeholder="••••••••"
          />
        </span>
      </label>
      <FormStateMessage error={state.error} success={state.success} />
      <SubmitButton />
      <p className="text-center text-[13.5px] text-[var(--app-muted)]">
        New here?{" "}
        <Link href="/sign-up" className="font-semibold text-[var(--app-accent-text)]">
          Create an account
        </Link>
      </p>
    </form>
  );
}
