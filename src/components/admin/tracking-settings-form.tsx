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
    <Button type="submit" busy={pending} className="min-w-40">
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
    <form action={formAction} className="grid gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="app-kicker text-[var(--app-muted)]">Configuration</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--app-text)]">
            Public defaults and one lead connector
          </h3>
          <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">
            Keep this page operational: define the account-wide public defaults,
            then decide whether leads should also sync into one Mailchimp audience.
          </p>
        </div>

        <div className="w-fit rounded-full border border-[var(--app-line)] bg-[var(--app-panel-muted)]/72 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-text)]">
          {isMailchimpConnected ? "Mailchimp connected" : "Mailchimp only"}
        </div>
      </div>

      <div className="grid gap-5 2xl:grid-cols-2">
        <section className="rounded-[1.6rem] border border-[var(--app-line)] bg-white px-5 py-5 shadow-[0_1px_0_rgba(255,255,255,0.72)_inset] sm:px-6">
          <p className="app-kicker text-[var(--app-muted)]">Public defaults</p>
          <h4 className="mt-2 text-xl font-semibold text-[var(--app-text)]">
            What every live page inherits
          </h4>
          <p className="mt-2 text-sm leading-7 text-[var(--app-muted)]">
            Keep the public brand clean and define whether Meta Pixel can run on
            published pages.
          </p>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[var(--app-text)]">Site name</span>
              <input name="site_name" defaultValue={config.siteName} className="app-input" />
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
          </div>
        </section>

        <section className="rounded-[1.6rem] border border-[var(--app-line)] bg-white px-5 py-5 shadow-[0_1px_0_rgba(255,255,255,0.72)_inset] sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <p className="app-kicker text-[var(--app-muted)]">Mailchimp sync</p>
              <h4 className="mt-2 text-xl font-semibold text-[var(--app-text)]">
                Connect one audience and keep Backstage as the lead inbox
              </h4>
              <p className="mt-2 text-sm leading-7 text-[var(--app-muted)]">
                Every submission stores locally first. Mailchimp is optional
                outbound sync for teams that already work there.
              </p>
            </div>

            <div className="rounded-full border border-[var(--app-line)] bg-[var(--app-panel-muted)]/58 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-text)]">
              {isMailchimpConnected ? "Connected" : "Local only"}
            </div>
          </div>

          <div className="mt-4 rounded-[1.15rem] border border-[var(--app-line)] bg-[var(--app-panel-muted)]/42 px-4 py-3 text-sm leading-6 text-[var(--app-muted)]">
            Backstage stores every lead locally first. Mailchimp is optional sync,
            not the primary inbox.
          </div>

          <div className="mt-5 grid gap-4">
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
          </div>

          <div className="mt-5 grid gap-3">
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
          </div>
        </section>
      </div>

      <FormStateMessage error={state.error} success={state.success} />

      <div className="flex flex-col gap-4 border-t border-[var(--app-line)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-7 text-[var(--app-muted)]">
          Save here to update account-wide defaults. Song-specific lead offers and
          downloads still live inside each release editor.
        </p>
        <SubmitButton />
      </div>
    </form>
  );
}
