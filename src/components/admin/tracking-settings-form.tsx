"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { INITIAL_ACTION_STATE, type ActionState } from "@/app/admin/action-types";
import { saveTrackingSettingsAction } from "@/app/admin/actions";
import { FormStateMessage } from "@/components/admin/form-state";
import { Button } from "@/components/ui/button";
import type { TrackingConfig } from "@/lib/types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" busy={pending}>
      Save settings
    </Button>
  );
}

export function TrackingSettingsForm({
  config,
}: {
  config: TrackingConfig;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    saveTrackingSettingsAction,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2">
        <span className="text-sm text-[var(--app-muted)]">Site name</span>
        <input
          name="site_name"
          defaultValue={config.siteName}
          className="app-input"
        />
      </label>
      <label className="grid gap-2">
        <span className="text-sm text-[var(--app-muted)]">Meta Pixel ID</span>
        <input
          name="meta_pixel_id"
          defaultValue={config.metaPixelId ?? ""}
          className="app-input"
          placeholder="123456789012345"
        />
      </label>
      <label className="grid gap-2">
        <span className="text-sm text-[var(--app-muted)]">Meta test event code</span>
        <input
          name="meta_test_event_code"
          defaultValue={config.metaTestEventCode ?? ""}
          className="app-input"
          placeholder="Optional for Events Manager testing"
        />
      </label>
      <label className="flex items-center gap-3 rounded-2xl border border-[var(--app-line)] bg-white/78 px-4 py-3 text-sm text-[var(--app-text)]">
        <input
          name="meta_pixel_enabled"
          type="checkbox"
          defaultChecked={config.metaPixelEnabled}
          className="h-4 w-4 rounded border-white/20 bg-transparent"
        />
        Enable Meta Pixel on published song pages
      </label>
      <FormStateMessage error={state.error} success={state.success} />
      <SubmitButton />
    </form>
  );
}
