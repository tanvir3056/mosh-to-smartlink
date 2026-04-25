"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { INITIAL_ACTION_STATE, type ActionState } from "@/app/admin/action-types";
import { saveTrackingSettingsAction } from "@/app/admin/actions";
import { FormStateMessage } from "@/components/admin/form-state";
import { Button } from "@/components/ui/button";
import type { EmailConnectorConfig, TrackingConfig } from "@/lib/types";

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
  connector,
}: {
  config: TrackingConfig;
  connector: EmailConnectorConfig;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    saveTrackingSettingsAction,
    INITIAL_ACTION_STATE,
  );
  const isMailchimpConnected = connector.hasApiKey && Boolean(connector.audienceId);

  return (
    <form action={formAction} className="grid gap-5">
      <section className="grid gap-4">
        <div>
          <p className="app-kicker text-[var(--app-muted)]">Brand and tracking</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--app-text)]">
            Public page defaults
          </h3>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--app-text)]">Site name</span>
          <input
            name="site_name"
            defaultValue={config.siteName}
            className="app-input"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--app-text)]">Meta Pixel ID</span>
          <input
            name="meta_pixel_id"
            defaultValue={config.metaPixelId ?? ""}
            className="app-input"
            placeholder="123456789012345"
          />
        </label>
        <label className="app-card-soft flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-[var(--app-text)]">
          <input
            name="meta_pixel_enabled"
            type="checkbox"
            defaultChecked={config.metaPixelEnabled}
            className="h-4 w-4 rounded border-slate-300 bg-transparent"
          />
          Enable Meta Pixel on published song pages
        </label>
      </section>

      <section className="grid gap-4 rounded-[1.5rem] border border-[var(--app-line)] bg-[var(--app-panel-muted)]/55 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="app-kicker text-[var(--app-muted)]">Lead connector</p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--app-text)]">
              Mailchimp
            </h3>
            <p className="mt-2 text-sm leading-7 text-[var(--app-muted)]">
              Leads still save inside Backstage even if Mailchimp is not connected.
            </p>
          </div>
          <div className="rounded-full border border-[var(--app-line)] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-text)]">
            {isMailchimpConnected ? "Connected" : "Local only"}
          </div>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--app-text)]">Mailchimp Audience ID</span>
          <input
            name="mailchimp_audience_id"
            defaultValue={connector.audienceId ?? ""}
            className="app-input"
            placeholder="a1b2c3d4e5"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--app-text)]">Mailchimp API key</span>
          <input
            name="mailchimp_api_key"
            className="app-input"
            placeholder={
              connector.hasApiKey
                ? "Leave blank to keep the saved key"
                : "us21-key-goes-here"
            }
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--app-text)]">Default tags</span>
          <input
            name="mailchimp_default_tags"
            defaultValue={connector.defaultTags ?? ""}
            className="app-input"
            placeholder="smart-link, release-campaign"
          />
        </label>

        <label className="app-card-soft flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-[var(--app-text)]">
          <input
            name="mailchimp_double_opt_in"
            type="checkbox"
            defaultChecked={connector.doubleOptIn}
            className="h-4 w-4 rounded border-slate-300 bg-transparent"
          />
          Use Mailchimp double opt-in for new contacts
        </label>

        {connector.hasApiKey ? (
          <label className="app-card-soft flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-[var(--app-text)]">
            <input
              name="mailchimp_clear_api_key"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 bg-transparent"
            />
            Clear the saved Mailchimp API key
          </label>
        ) : null}
      </section>

      <FormStateMessage error={state.error} success={state.success} />
      <SubmitButton />
    </form>
  );
}
